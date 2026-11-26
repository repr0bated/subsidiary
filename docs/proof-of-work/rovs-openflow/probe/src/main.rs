//! Read-only probe of rovs 0.2.0 against OVS's bridge management socket.
//! Sends only HELLO, BARRIER, ECHO and read requests (flow stats, NX flow
//! monitor). No FLOW_MOD, no bundle, no OVSDB.
use bytes::{Bytes, BytesMut};
use rovs_openflow::{
    FlowMonitorRequest, FlowStatsEntry, FlowStatsRequest, Header, Message, MessageType, OfError,
    VConn, Version, monitor_flags,
};
use rovs_transport::{Address, Stream};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn send(s: &mut Stream, m: &Message) {
    s.write_all(&m.encode()).await.unwrap();
    s.flush().await.unwrap();
}

/// Read one message; report header bytes even when rovs cannot decode the type.
async fn recv(s: &mut Stream) -> Result<Message, String> {
    let mut h = [0u8; 8];
    s.read_exact(&mut h).await.map_err(|e| e.to_string())?;
    let len = u16::from_be_bytes([h[2], h[3]]) as usize;
    let mut body = BytesMut::zeroed(len - 8);
    if len > 8 {
        s.read_exact(&mut body).await.map_err(|e| e.to_string())?;
    }
    match Header::decode(&mut Bytes::copy_from_slice(&h)) {
        Ok(header) => Ok(Message { header, body: body.freeze() }),
        Err(e) => Err(format!("rovs header decode failed: raw={h:02x?} err={e}")),
    }
}

async fn recv_t(s: &mut Stream) -> Result<Message, String> {
    tokio::time::timeout(Duration::from_secs(3), recv(s))
        .await
        .map_err(|_| "timeout".to_string())?
}

fn show_err(m: &Message) {
    if m.header.msg_type == MessageType::Error {
        println!("    error body: {:?}", OfError::parse(&m.body));
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let path = std::env::args().nth(1).unwrap_or("/var/run/openvswitch/ovsbr0.mgmt".into());
    let addr: Address = format!("unix:{path}").parse().unwrap();
    println!("address parsed: {addr:?}");

    // A. VConn::connect as shipped.
    match VConn::connect(&addr).await {
        Ok(v) => println!("A. VConn::connect ok, negotiated {:?}", v.version()),
        Err(e) => println!("A. VConn::connect failed: {e}"),
    }

    // B. Raw hello at OF1.5 over rovs_transport::Stream with rovs Message.
    let mut s = Stream::connect(&addr).await.unwrap();
    send(&mut s, &Message::new(Version::Of15, MessageType::Hello, 1, Bytes::new())).await;
    let hello = recv_t(&mut s).await;
    match &hello {
        Ok(m) => println!(
            "B. OF1.5 hello reply: type={:?} version={:?} body_len={}",
            m.header.msg_type, m.header.version, m.body.len()
        ),
        Err(e) => println!("B. OF1.5 hello reply: {e}"),
    }
    let v = match hello {
        Ok(m) if m.header.msg_type == MessageType::Hello => m.header.version.min(Version::Of15),
        _ => return,
    };
    println!("   negotiated {v:?}");

    // C. Barrier.
    send(&mut s, &Message::new(v, MessageType::BarrierRequest, 2, Bytes::new())).await;
    match recv_t(&mut s).await {
        Ok(m) => {
            println!("C. barrier reply: {:?} xid={}", m.header.msg_type, m.header.xid);
            show_err(&m);
        }
        Err(e) => println!("C. barrier: {e}"),
    }

    // D. Echo.
    send(&mut s, &Message::new(v, MessageType::EchoRequest, 3, Bytes::new())).await;
    match recv_t(&mut s).await {
        Ok(m) => println!("D. echo reply: {:?}", m.header.msg_type),
        Err(e) => println!("D. echo: {e}"),
    }

    // E. Flow stats / flow desc (multipart type 1) at the negotiated version.
    send(&mut s, &FlowStatsRequest::new().to_message(v, 4)).await;
    loop {
        match recv_t(&mut s).await {
            Ok(m) => {
                println!("E. multipart reply: {:?} body_len={}", m.header.msg_type, m.body.len());
                show_err(&m);
                if m.header.msg_type != MessageType::MultipartReply {
                    break;
                }
                let b = &m.body;
                let mp_type = u16::from_be_bytes([b[0], b[1]]);
                let flags = u16::from_be_bytes([b[2], b[3]]);
                println!("   mp_type={mp_type} flags={flags:#x}");
                let mut off = 8;
                while off + 4 <= b.len() {
                    let len = u16::from_be_bytes([b[off], b[off + 1]]) as usize;
                    let raw = &b[off..off + len.min(b.len() - off)];
                    println!("   entry len={len} first56={:02x?}", &raw[..raw.len().min(56)]);
                    match FlowStatsEntry::decode(raw) {
                        Ok((e, _)) => println!(
                            "   rovs FlowStatsEntry (OF1.3 layout): table={} prio={} cookie={:#x} pkts={} match={:?}",
                            e.table_id, e.priority, e.cookie, e.packet_count, e.match_fields
                        ),
                        Err(err) => println!("   rovs FlowStatsEntry decode error: {err}"),
                    }
                    if len == 0 {
                        break;
                    }
                    off += len;
                }
                if flags & 1 == 0 {
                    break;
                }
            }
            Err(e) => {
                println!("E. {e}");
                break;
            }
        }
    }

    // F. NX flow monitor (rovs FlowMonitorRequest) at the negotiated version.
    let req = FlowMonitorRequest::new(7).flags(monitor_flags::INITIAL | monitor_flags::ACTIONS);
    send(&mut s, &req.to_message(v, 5)).await;
    match recv_t(&mut s).await {
        Ok(m) => {
            println!("F. NX flow monitor reply: {:?} body_len={}", m.header.msg_type, m.body.len());
            show_err(&m);
        }
        Err(e) => println!("F. NX flow monitor: {e}"),
    }

    // G. Same NX flow monitor through VConn as shipped (OF1.3), plus its flow dump.
    let mut v13 = VConn::connect(&addr).await.unwrap();
    match tokio::time::timeout(Duration::from_secs(3), v13.dump_flows()).await {
        Ok(Ok(flows)) => {
            for f in &flows {
                println!(
                    "G. OF1.3 dump_flows: table={} prio={} cookie={:#x} pkts={} instr_len={}",
                    f.table_id, f.priority, f.cookie, f.packet_count, f.instructions.len()
                );
            }
        }
        Ok(Err(e)) => println!("G. OF1.3 dump_flows error: {e}"),
        Err(_) => println!("G. OF1.3 dump_flows timeout"),
    }
    let req = FlowMonitorRequest::new(8).flags(monitor_flags::INITIAL | monitor_flags::ACTIONS);
    match tokio::time::timeout(Duration::from_secs(3), v13.monitor_flows(req)).await {
        Ok(Ok(u)) => println!("G. OF1.3 NX monitor initial updates: {}", u.len()),
        Ok(Err(e)) => println!("G. OF1.3 NX monitor error: {e}"),
        Err(_) => println!("G. OF1.3 NX monitor timeout"),
    }
}

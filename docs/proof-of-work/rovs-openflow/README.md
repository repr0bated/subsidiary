# Proof of work: rovs-openflow

Code lives in `/srv/git/odbus-verified`, branch `hackathon/kiroween` (github.com/repr0bated/odbus-verified).
Spec: `.kiro/specs/rovs-openflow/` in that repo. One section per task: commit, commands run, results, what was not done.
Anyone can check a claim by checking out the commit and rerunning the command listed.

Limits on every task: no `ovs-*` command, no FLOW_MOD or OVSDB write to the live switch, no deploy, no service restart, no reseal on the live host. Builds: `CARGO_BUILD_JOBS=2 cargo test -p <crate>` (debug), one cargo at a time.

## Task 1: rovs 0.2.0 surface

- Commit: `0f5f2171819ac0d99e91efcaeb4eae2398837b0e` (design.md section *rovs 0.2.0 surface*, tasks.md 1 checked).
- Probe: `probe/` in this directory (rovs code only; sends HELLO, BARRIER, ECHO, flow-stats and flow-monitor requests, nothing that changes the switch).
- Command: `cargo build` in `probe/`, then `sudo -n target/debug/rovs-probe-kiroween /var/run/openvswitch/ovsbr0.mgmt`.
- Output, 2026-11-26 02:23 EST:

```
address parsed: Unix("/var/run/openvswitch/ovsbr0.mgmt")
A. VConn::connect ok, negotiated Of13
B. OF1.5 hello reply: type=Hello version=Of15 body_len=0
   negotiated Of15
C. barrier reply: BarrierReply xid=2
D. echo reply: EchoReply
E. multipart reply: MultipartReply body_len=120
   mp_type=1 flags=0x0
   entry len=112 first56=[00, 70, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 00, 01, 00, 04, 00, 00, 00, 00, 00, 00, 00, 34, 80, 02, 00, 08, 00, 00, 36, ae, 2e, 31, 8f, c0, 80, 02, 02, 08, 00, 00, 00, 00]
   rovs FlowStatsEntry decode error: parse error: unsupported match type: 32770
F. NX flow monitor reply: Error body_len=40
    error body: Ok(OfError { error_type: BadRequest, code: 4, data: [...] })
G. OF1.3 dump_flows: table=0 prio=0 cookie=0x0 pkts=885743 instr_len=24
G. OF1.3 NX monitor error: BAD_REQUEST: unknown experimenter type
```

- Findings: OVS answers a 1.5 hello at 1.5, but rovs `VConn` only offers 1.3. rovs has no bundle encoding. rovs cannot decode the 1.5 flow-dump entry. OVS rejects flow monitor on `.mgmt`. `rovs-ext` 0.2.0 is available. Line G shows the switch holds one flow, the priority-0 `NORMAL` with cookie 0x0.

## Task 2: OpenFlow 1.5 client over a Unix socket

- Commit: `29c31d4ba31045e1118ca37f0be026a3f42b9fae` (`crates/op-network/src/openflow.rs`).
- Command: `CARGO_BUILD_JOBS=2 cargo test -p op-network --lib openflow::tests` in `/srv/git/odbus-verified`.
- Result, rerun 2026-11-26 after the move to `/srv/git/odbus-verified`: 6 passed, 0 failed.
  hello_is_sent_and_negotiated_at_of15, echo_round_trips_at_of15, switch_echo_request_is_answered_while_waiting_for_barrier, add_flow_sends_flow_mod_then_barrier_at_of15, refused_flow_mod_is_an_error, reconnect_after_the_switch_closes_does_a_fresh_hello.
- Red check: with the hello changed to `Version::Of13`, hello_is_sent_and_negotiated_at_of15 failed (5 passed, 1 failed); restored afterwards.
- Whole `op-network` lib: 81 passed, 1 failed. The failure, `rovs_proxy::native_tests::native_owner_round_trip_covers_rovs_commands_and_ovsdb_bridge_methods`, needs `/usr/bin/ovsdb-tool`, which is not installed on this host. That code was not changed.
- Tests use a fake switch on a Unix socket; nothing was sent to the live switch.

## Housekeeping, 2026-11-26

- A duplicate unattended agent (tmux session `rovs`, same prompt) was running in the extra worktree `/srv/git/odbus-verified-wt/kiroween` and rewrote `openflow.rs` after task 2. Stopped on the owner's instruction; the worktree was clean with nothing unpushed, then removed with its build cache. Work continues in `/srv/git/odbus-verified`.

## Task 3: derived flow cookies

- Commit: `4aa316405db03728972859e44e8b797a958edcb8` (`crates/op-network/src/openflow_cookie.rs`).
- Rule: cookie = `0x33444348` prefix | first 32 bits of SHA-256 over `"3tched.openflow.cookie.v1\0" || len(bridge) || bridge || table || priority (BE) || rovs match encoding`. Hash is SHA-256 as in design D2 (Keccak-256 to match the receipt chain was proposed; owner has not chosen).
- Independent check of the pinned vectors, outside the code:
  `printf '3tched.openflow.cookie.v1\0\x06ovsbr0\x00\x00\x0a\x00\x01\x00\x04\x00\x00\x00\x00' | sha256sum` gives `1aa9a527...` (table 0, priority 10, empty match); priority 0 gives `bf93851b...`.
- Command: `CARGO_BUILD_JOBS=2 cargo test -p op-network --lib openflow_cookie`.
- Red: with stub bodies, 6 failed, 2 passed (bridge bounds and pinned match layout do not depend on the stubs).
- Green: 8 passed, 0 failed: bridge_name_bounds, empty_match_encoding_is_the_pinned_layout, cookie_matches_independent_sha256_vectors, same_identity_same_cookie, each_identity_field_changes_the_cookie, cookie_is_never_zero_and_carries_the_prefix, foreign_cookies_are_not_plugin_cookies, free_cookie_and_same_flow_pass_and_a_different_flow_collides.

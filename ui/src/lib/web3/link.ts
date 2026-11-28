import type { Hex } from './client';
import type { RecordEntry } from './disclosure';
import { keccak256 } from './keccak';
import { canonicalJson } from './terms';

/**
 * The link between the public record and 3tched's hash chain: every id that names the same
 * record, tied together inside one time bubble.
 *
 *   public chain   chain id, EtchedRecord address, record id, root, tx hash, block number and hash, block time
 *   hash chain     event id, event hash and time of the event that took the record in
 *   vector         the ledger point id 3tched's vectorizer gives that event
 *   private entry  keccak256 of the entry (full record and salts) the event holds
 *
 * The bubble opens at the public block's time (the record starts on the public chain) and closes
 * `seconds` later; the hash-chain event must fall inside it. `skew` allows the host clock to run
 * a little behind the block's clock. A link outside its bubble is not a link.
 *
 * The vector id is not looked up: it is derived, exactly as op-cognitive's `ledger_point_id`
 * does (odbus-verified crates/op-cognitive/src/chain_vectors.rs): UUIDv5 in the fixed namespace
 * 3c0b91e4-5a27-4d6f-8b12-e6f409d3a751 over "ledger:<event_hash>". So anyone holding the event
 * hash can name the vector, and a search hit on that vector leads straight back to the event and
 * from there to the public record.
 */

export const LINK_VERSION = 'subsidiary.link/1';
export const LEDGER_POINT_NAMESPACE = '3c0b91e4-5a27-4d6f-8b12-e6f409d3a751';
export const DEFAULT_BUBBLE_SECONDS = 300;
export const DEFAULT_SKEW_SECONDS = 5;

/** Where and when the record was published, read from the public chain. */
export interface PublicRef {
  chainId: number;
  contract: Hex;
  recordId: number;
  root: Hex;
  txHash: Hex;
  blockNumber: number;
  blockHash: Hex;
  /** Unix seconds of the block. */
  blockTime: number;
}

/** The hash-chain event that took the record in, as `snowball.query_events` returns it. */
export interface ChainEvent {
  event_id: number;
  event_hash: string;
  /** RFC 3339. */
  timestamp: string;
}

export interface Link {
  version: typeof LINK_VERSION;
  bubble: { opensAt: number; closesAt: number };
  public: PublicRef;
  hashchain: { eventId: number; eventHash: string; time: number };
  vector: { ledgerPointId: string };
  entryHash: Hex;
}

/** UUIDv5 (RFC 9562): SHA-1 over namespace bytes and name, version and variant bits set. */
export async function uuidV5(namespace: string, name: string): Promise<string> {
  const ns = namespace.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/.test(ns)) throw new Error('namespace is not a UUID');
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nsBytes[i] = parseInt(ns.slice(2 * i, 2 * i + 2), 16);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(16 + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, 16);
  const h = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', data)).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The vector point 3tched keys an event's embedding under. */
export function ledgerPointId(eventHash: string): Promise<string> {
  return uuidV5(LEDGER_POINT_NAMESPACE, `ledger:${eventHash}`);
}

export function entryHash(entry: RecordEntry): Hex {
  return keccak256(canonicalJson(entry));
}

export function eventSeconds(event: ChainEvent): number {
  const ms = Date.parse(event.timestamp);
  if (Number.isNaN(ms)) throw new Error(`event ${event.event_id} has no readable timestamp`);
  return Math.floor(ms / 1000);
}

export interface BubbleOptions {
  seconds?: number;
  skew?: number;
}

/** Tie the ids together. Throws if the event falls outside the bubble or the roots differ. */
export async function buildLink(pub: PublicRef, event: ChainEvent, entry: RecordEntry, opts: BubbleOptions = {}): Promise<Link> {
  const seconds = opts.seconds ?? DEFAULT_BUBBLE_SECONDS;
  const skew = opts.skew ?? DEFAULT_SKEW_SECONDS;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('bubble seconds must be a positive integer');
  if (!Number.isSafeInteger(skew) || skew < 0) throw new Error('skew must be a whole number of seconds');
  const link: Link = {
    version: LINK_VERSION,
    bubble: { opensAt: pub.blockTime - skew, closesAt: pub.blockTime + seconds },
    public: pub,
    hashchain: { eventId: event.event_id, eventHash: event.event_hash, time: eventSeconds(event) },
    vector: { ledgerPointId: await ledgerPointId(event.event_hash) },
    entryHash: entryHash(entry)
  };
  const problems = await checkLink(link, { entry, event, pub });
  if (problems.length) throw new Error(problems.join('; '));
  return link;
}

/**
 * Check a link against what each side says now. Pass what you have: the public ref read from the
 * chain, the event read from the hash chain, the entry the event holds. Returns the problems found.
 */
export async function checkLink(
  link: Link,
  have: { pub?: PublicRef; event?: ChainEvent; entry?: RecordEntry } = {}
): Promise<string[]> {
  const problems: string[] = [];
  if (link?.version !== LINK_VERSION) return [`unknown link version ${String(link?.version)}`];
  const { bubble, hashchain } = link;
  if (!(bubble.opensAt <= link.public.blockTime && link.public.blockTime <= bubble.closesAt)) {
    problems.push('public block time is outside the bubble');
  }
  if (!(bubble.opensAt <= hashchain.time && hashchain.time <= bubble.closesAt)) {
    problems.push('hash-chain event time is outside the bubble');
  }
  if (link.vector.ledgerPointId !== (await ledgerPointId(hashchain.eventHash))) {
    problems.push('vector id is not the ledger point id of the event hash');
  }
  if (have.pub && canonicalJson(have.pub) !== canonicalJson(link.public)) problems.push('public chain says something else');
  if (have.event) {
    if (have.event.event_id !== hashchain.eventId || have.event.event_hash !== hashchain.eventHash) {
      problems.push('hash-chain event id or hash differs');
    } else if (eventSeconds(have.event) !== hashchain.time) {
      problems.push('hash-chain event time differs');
    }
  }
  if (have.entry) {
    if (entryHash(have.entry) !== link.entryHash) problems.push('entry differs from the one linked');
    if (have.entry.root !== link.public.root) problems.push('entry root differs from the public root');
  }
  return problems;
}

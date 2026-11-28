import { etchedAnchor, hireContract } from './abi';

/**
 * Read-only view of the public record: HireContract hires and EtchedAnchor heads, over plain
 * JSON-RPC `eth_call`. It sends no transaction and holds no key. It mirrors the holder checks in
 * web3/script/verify-hire.sh (status, anchor, head); the terms-hash check stays in that script.
 * shortcut: no keccak in the UI, so terms are not re-hashed here; add it with a hash library if the
 * canvas must check terms itself.
 */

export type Hex = `0x${string}`;

export const HIRE_STATUS = ['None', 'Created', 'Accepted', 'Cancelled', 'Delivered', 'Completed'] as const;
export type HireStatus = (typeof HIRE_STATUS)[number];

export interface Hire {
  client: Hex;
  provider: Hex;
  termsHash: Hex;
  workHead: Hex;
  warrantyPeriod: bigint;
  createdAt: bigint;
  acceptedAt: bigint;
  deliveredAt: bigint;
  completedAt: bigint;
  status: HireStatus;
  clientConfirmed: boolean;
  providerConfirmed: boolean;
}

export interface AnchorInfo {
  head: Hex;
  anchored: boolean;
  /** Unix seconds of the first anchoring; 0 when not anchored. */
  timestamp: bigint;
  anchoredBy: Hex;
}

export interface ReceiptCheck extends AnchorInfo {
  /** Present when a hire id was given. */
  hire?: { id: bigint; completed: boolean; matchesWorkHead: boolean };
  /** True only if the head is anchored and, for a hire, the hire is Completed with this work head. */
  ok: boolean;
}

export interface ChainReaderOptions {
  rpcUrl: string;
  hire: string;
  /** EtchedAnchor address; read from the hire contract's `anchor()` when omitted. */
  anchor?: string;
  fetch?: typeof fetch;
}

export class RpcError extends Error {}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function address(a: string, what: string): Hex {
  if (!ADDRESS.test(a)) throw new Error(`invalid ${what} address`);
  return a as Hex;
}

/** A receipt-chain hash as bytes32: hex left-padded with zeros, as anchor-head.sh writes it. */
export function toBytes32(hash: string): Hex {
  const h = hash.startsWith('0x') ? hash.slice(2) : hash;
  if (!/^[0-9a-fA-F]{1,64}$/.test(h)) throw new Error('invalid head hash');
  return `0x${h.toLowerCase().padStart(64, '0')}`;
}

function uintWord(n: bigint | number): string {
  const v = BigInt(n);
  if (v < 0n || v >= 1n << 256n) throw new Error('uint out of range');
  return v.toString(16).padStart(64, '0');
}

function words(result: string, n: number): string[] {
  if (!/^0x[0-9a-fA-F]*$/.test(result) || result.length < 2 + 64 * n) throw new RpcError('short or invalid eth_call result');
  return Array.from({ length: n }, (_, i) => result.slice(2 + 64 * i, 2 + 64 * (i + 1)));
}

const asAddress = (w: string): Hex => `0x${w.slice(24)}`;
const asBytes32 = (w: string): Hex => `0x${w}`;
const asUint = (w: string): bigint => BigInt(`0x${w}`);
const asBool = (w: string): boolean => asUint(w) !== 0n;

export function createChainReader(opts: ChainReaderOptions) {
  const doFetch = opts.fetch ?? fetch;
  const hire = address(opts.hire, 'hire');
  let anchor: Hex | undefined = opts.anchor === undefined ? undefined : address(opts.anchor, 'anchor');
  let nextId = 1;

  async function call(to: Hex, selector: string, ...args: string[]): Promise<string> {
    const body = { jsonrpc: '2.0', id: nextId++, method: 'eth_call', params: [{ to, data: `0x${selector}${args.join('')}` }, 'latest'] };
    const res = await doFetch(opts.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new RpcError(`rpc http ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (json.error) throw new RpcError(json.error.message ?? 'rpc error');
    if (typeof json.result !== 'string') throw new RpcError('rpc returned no result');
    return json.result;
  }

  async function anchorAddress(): Promise<Hex> {
    if (!anchor) anchor = address(asAddress(words(await call(hire, hireContract.methods['anchor()']), 1)[0]), 'anchor');
    return anchor;
  }

  async function hireCount(): Promise<bigint> {
    return asUint(words(await call(hire, hireContract.methods['hireCount()']), 1)[0]);
  }

  /** A hire's state. Throws RpcError for an unknown id (the contract reverts). */
  async function getHire(id: bigint | number): Promise<Hire> {
    const w = words(await call(hire, hireContract.methods['getHire(uint256)'], uintWord(id)), 12);
    const status = HIRE_STATUS[Number(asUint(w[9]))];
    if (!status) throw new RpcError('unknown hire status');
    return {
      client: asAddress(w[0]),
      provider: asAddress(w[1]),
      termsHash: asBytes32(w[2]),
      workHead: asBytes32(w[3]),
      warrantyPeriod: asUint(w[4]),
      createdAt: asUint(w[5]),
      acceptedAt: asUint(w[6]),
      deliveredAt: asUint(w[7]),
      completedAt: asUint(w[8]),
      status,
      clientConfirmed: asBool(w[10]),
      providerConfirmed: asBool(w[11])
    };
  }

  /** When and by whom a head was first anchored. */
  async function anchorOf(headHash: string): Promise<AnchorInfo> {
    const head = toBytes32(headHash);
    const w = words(await call(await anchorAddress(), etchedAnchor.methods['anchorOf(bytes32)'], head.slice(2)), 2);
    const timestamp = asUint(w[0]);
    return { head, anchored: timestamp !== 0n, timestamp, anchoredBy: asAddress(w[1]) };
  }

  /** Check a receipt's head against the public record, and optionally against a hire's work head. */
  async function checkReceipt(headHash: string, hireId?: bigint | number): Promise<ReceiptCheck> {
    const info = await anchorOf(headHash);
    if (hireId === undefined) return { ...info, ok: info.anchored };
    const h = await getHire(hireId);
    const completed = h.status === 'Completed';
    const matchesWorkHead = h.workHead.toLowerCase() === info.head;
    return { ...info, hire: { id: BigInt(hireId), completed, matchesWorkHead }, ok: info.anchored && completed && matchesWorkHead };
  }

  return { hireCount, getHire, anchorOf, checkReceipt, anchorAddress };
}

export type ChainReader = ReturnType<typeof createChainReader>;

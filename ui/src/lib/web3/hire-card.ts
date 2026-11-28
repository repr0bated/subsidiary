import { createChainReader, type Hex, type HireStatus } from './client';

/**
 * DRAFT, off by default: data for the /preview hire and receipt card. It reads the chain only
 * when PUBLIC_WEB3_RPC_URL and PUBLIC_WEB3_HIRE_ADDRESS are set at build or dev time. Without
 * them nothing is fetched and the card renders nothing. Whether the browser may call a chain RPC
 * at all is an open owner decision (chat-canvas-ui design §2: the door is the only backend path),
 * so the live chat canvas does not use this.
 */

export interface Web3Config {
  rpcUrl: string;
  hire: string;
  anchor?: string;
  /** Hire to show; the latest hire when unset. */
  hireId?: bigint;
  /** Receipt head to check; the hire's own work head when unset. */
  head?: string;
}

export interface HireCardView {
  hireId: bigint;
  status: HireStatus;
  termsHash: Hex;
  workHead: Hex;
  /** The checked head is anchored in EtchedAnchor. */
  anchored: boolean;
  anchoredAt: bigint;
  /** Anchored, hire Completed, and the head equals the hire's work head. */
  receiptOk: boolean;
}

type Env = Record<string, string | undefined>;

const opt = (v: string | undefined): string | undefined => (v === undefined || v.trim() === '' ? undefined : v.trim());

/** null when the draft is off (no RPC URL). Throws when it is on but set up wrong. */
export function readWeb3Config(env: Env): Web3Config | null {
  const rpcUrl = opt(env.PUBLIC_WEB3_RPC_URL);
  if (!rpcUrl) return null;
  if (!/^https?:\/\//.test(rpcUrl)) throw new Error('PUBLIC_WEB3_RPC_URL must be an http(s) URL');
  const hire = opt(env.PUBLIC_WEB3_HIRE_ADDRESS);
  if (!hire) throw new Error('PUBLIC_WEB3_HIRE_ADDRESS is required when PUBLIC_WEB3_RPC_URL is set');
  const id = opt(env.PUBLIC_WEB3_HIRE_ID);
  if (id !== undefined && !/^[1-9][0-9]*$/.test(id)) throw new Error('PUBLIC_WEB3_HIRE_ID must be a positive integer');
  return { rpcUrl, hire, anchor: opt(env.PUBLIC_WEB3_ANCHOR_ADDRESS), hireId: id === undefined ? undefined : BigInt(id), head: opt(env.PUBLIC_WEB3_RECEIPT_HEAD) };
}

/** The card's data; null when there is no hire yet. Read-only `eth_call`s, no key, no transaction. */
export async function loadHireCard(config: Web3Config, doFetch?: typeof fetch): Promise<HireCardView | null> {
  const reader = createChainReader({ rpcUrl: config.rpcUrl, hire: config.hire, anchor: config.anchor, fetch: doFetch });
  const hireId = config.hireId ?? (await reader.hireCount());
  if (hireId === 0n) return null;
  const h = await reader.getHire(hireId);
  const check = await reader.checkReceipt(config.head ?? h.workHead, hireId);
  return { hireId, status: h.status, termsHash: h.termsHash, workHead: h.workHead, anchored: check.anchored, anchoredAt: check.timestamp, receiptOk: check.ok };
}

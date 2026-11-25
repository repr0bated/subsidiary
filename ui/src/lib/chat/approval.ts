import { stripCapabilities } from '../catalog/runnable';
import type { Receipt } from '../door/types';

/**
 * Human approval of a mutation the responder proposed (requirement 5.3, design §5).
 * The answer uses the backend's exact turn_id, tool_call_id and digest, read with
 * get_pending_tool; nothing in a rendered view or model output can change them.
 */
type Call = (plugin: string, method: string, args?: unknown) => Promise<Receipt>;

export interface PendingProposal {
  turn_id: string;
  tool_call_id: string;
  digest: string;
  plugin_id: string;
  method: string;
  arguments: unknown;
  expires_at?: string;
  decision?: unknown;
}

/** What the chatbot may show about a proposal: no capability, no digest. */
export interface ShownProposal {
  plugin_id: string;
  method: string;
  arguments: unknown;
  expires_at?: string;
}

function inner(r: Receipt): Record<string, unknown> {
  const x = (r.result ?? {}) as Record<string, unknown>;
  return (x.result as Record<string, unknown>) ?? x;
}

export async function readPending(call: Call, turnId: string): Promise<PendingProposal | null> {
  const p = inner(await call('chat_response', 'get_pending_tool', { turn_id: turnId })).proposal as PendingProposal | null | undefined;
  return p && p.digest && p.tool_call_id ? p : null;
}

export function showProposal(p: PendingProposal): ShownProposal {
  return { plugin_id: p.plugin_id, method: p.method, arguments: stripCapabilities(p.arguments), expires_at: p.expires_at };
}

export function answerPending(call: Call, p: PendingProposal, approved: boolean): Promise<Receipt> {
  return call('chat_response', 'approve_pending_tool', {
    turn_id: p.turn_id,
    tool_call_id: p.tool_call_id,
    digest: p.digest,
    approved
  });
}

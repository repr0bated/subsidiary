import { stripCapabilities } from '../catalog/runnable';
import type { Receipt } from '../door/types';

/**
 * The accountability view (requirement 6c): find events in the identity's own record by meaning
 * (`snowball.search_own_events`), then question the chatbot about them. Capability fields are
 * stripped before anything is shown.
 */
type Call = (plugin: string, method: string, args?: unknown) => Promise<Receipt>;

export interface ShownEvent {
  event_id: number;
  event_hash: string;
  prev_hash: string;
  plugin_id: string;
  method_name: string;
  operation_type?: string;
  timestamp?: string;
  decision?: string;
  score: number;
}

function inner(r: Receipt): Record<string, unknown> {
  const x = (r.result ?? {}) as Record<string, unknown>;
  return (x.result as Record<string, unknown>) ?? x;
}

export async function searchOwnEvents(call: Call, query: string, limit = 10): Promise<ShownEvent[]> {
  const q = query.trim();
  if (!q) return [];
  const out = inner(await call('snowball', 'search_own_events', { query: q.slice(0, 4000), limit: Math.max(1, Math.min(20, limit)) }));
  const matches = Array.isArray(out.matches) ? (out.matches as { event?: Record<string, unknown>; score?: number }[]) : [];
  return matches
    .filter((m) => m.event)
    .map((m) => {
      const e = stripCapabilities(m.event!) as Record<string, unknown>;
      return {
        event_id: Number(e.event_id),
        event_hash: String(e.event_hash ?? ''),
        prev_hash: String(e.prev_hash ?? ''),
        plugin_id: String(e.plugin_id ?? ''),
        method_name: String(e.method_name ?? ''),
        operation_type: e.operation_type as string | undefined,
        timestamp: e.timestamp as string | undefined,
        decision: e.decision as string | undefined,
        score: Number(m.score ?? 0)
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** The question put to the chatbot on the stand: answer only from this receipt. */
export function standQuestion(e: ShownEvent, question: string): string {
  return `About event ${e.event_id} (hash ${e.event_hash}, ${e.plugin_id}.${e.method_name}): ${question.trim()} Answer only from your own receipts and cite each one. If there is no record, say so.`;
}

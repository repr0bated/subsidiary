import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { stripCapabilities } from '../catalog/runnable';
import type { Receipt } from '../door/types';

/**
 * AI SDK transport over the door (design §5). A turn is one `chat_response.submit_turn` call as
 * the human; the answer is the committed turn read back with `get_turn_response`. Waiting for the
 * commit is injected (`waitForCommit`), driven by the StateSync feed, so this never polls.
 */

type Call = (plugin: string, method: string, args?: unknown) => Promise<Receipt>;

/** The committed answer's content, as `chat_response` defines it (ResponseContent). */
export type ResponseContent =
  | { kind: 'user_response'; message: string; message_type: string; canvas?: unknown; related_actions?: unknown[] }
  | { kind: 'clarification'; question: string; options?: unknown[]; context?: string | null; required_fields?: unknown[] }
  | { kind: 'refusal'; reason: string; category: string; alternatives?: unknown[] }
  | { kind: 'human_message'; message: string };

export interface TransportOptions {
  call: Call;
  /** The backend-minted conversation id (never minted here). */
  conversationId: () => string | Promise<string>;
  /** Resolves when the response turn is committed; rejects on abort. */
  waitForCommit: (responseTurnId: string, signal?: AbortSignal) => Promise<void>;
  responseMode?: 'text' | 'application';
}

function resultOf(r: Receipt): Record<string, unknown> {
  const inner = (r.result ?? r) as Record<string, unknown>;
  return (inner && typeof inner === 'object' && 'result' in inner ? (inner.result as Record<string, unknown>) : inner) ?? {};
}

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
    .trim();
}

/** Turn committed content into UI message chunks. Views become `flat` `data-spec` parts. */
export function contentToChunks(content: ResponseContent, messageId: string): UIMessageChunk[] {
  const chunks: UIMessageChunk[] = [{ type: 'start', messageId }];
  const text = (t: string, id = 'text-0') => {
    chunks.push({ type: 'text-start', id }, { type: 'text-delta', id, delta: t }, { type: 'text-end', id });
  };
  switch (content.kind) {
    case 'user_response':
      text(content.message);
      if (content.canvas && typeof content.canvas === 'object') {
        chunks.push({ type: 'data-spec', data: { type: 'flat', spec: stripCapabilities(content.canvas) } } as UIMessageChunk);
      }
      break;
    case 'clarification':
      text(content.question);
      break;
    case 'refusal':
      // Shown as refused; no capability is ever named (requirement 2.4, 5.5).
      text(content.reason);
      break;
    case 'human_message':
      break;
  }
  chunks.push({ type: 'finish' });
  return chunks;
}

function streamOf(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    }
  });
}

export function doorChatTransport(opts: TransportOptions): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, abortSignal }) {
      const last = messages[messages.length - 1];
      const submitted = resultOf(
        await opts.call('chat_response', 'submit_turn', {
          conversation_id: await opts.conversationId(),
          message: last ? textOf(last) : '',
          response_mode: opts.responseMode ?? 'application'
        })
      );
      const responseTurnId = String(submitted.response_turn_id ?? '');
      if (!responseTurnId) throw new Error('submit_turn returned no response_turn_id');
      await opts.waitForCommit(responseTurnId, abortSignal);
      const read = resultOf(await opts.call('chat_response', 'get_turn_response', { turn_id: responseTurnId }));
      const turn = read.turn as { content?: ResponseContent; response_id?: string } | null | undefined;
      if (!turn?.content) throw new Error('response turn not committed');
      return streamOf(contentToChunks(turn.content, String(turn.response_id ?? responseTurnId)));
    },
    async reconnectToStream() {
      // Nothing to resume: answers are committed turns, read again from the conversation.
      return null;
    }
  };
}

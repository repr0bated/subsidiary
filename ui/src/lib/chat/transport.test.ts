import { describe, expect, it } from 'vitest';
import { buildSpecFromParts } from '@json-render/svelte';
import { contentToChunks, doorChatTransport } from './transport';
import type { Receipt } from '../door/types';

describe('contentToChunks', () => {
  it('turns a committed canvas into a flat data-spec part that json-render rebuilds', () => {
    const canvas = {
      root: 'r',
      elements: { r: { type: 'Text', props: { text: 'hi', required_capability: 'secret.cap' }, children: [] } }
    };
    const chunks = contentToChunks({ kind: 'user_response', message: 'Here you go', message_type: 'success', canvas }, 'm1');
    const types = chunks.map((c) => c.type);
    expect(types[0]).toBe('start');
    expect(types).toContain('data-spec');
    expect(types[types.length - 1]).toBe('finish');
    const dataPart = chunks.find((c) => c.type === 'data-spec') as { type: string; data: unknown };
    const spec = buildSpecFromParts([{ type: 'data-spec', data: dataPart.data } as never], false);
    expect(spec?.root).toBe('r');
    expect(JSON.stringify(spec)).not.toContain('required_capability');
  });

  it('shows a refusal as text without naming a capability', () => {
    const chunks = contentToChunks({ kind: 'refusal', reason: 'Not available to you.', category: 'not_allowed' }, 'm2');
    const text = chunks.filter((c) => c.type === 'text-delta').map((c) => (c as { delta: string }).delta).join('');
    expect(text).toBe('Not available to you.');
  });
});

describe('doorChatTransport', () => {
  it('submits one turn, waits for the commit, then reads it back', async () => {
    const calls: [string, string, unknown][] = [];
    const call = async (p: string, m: string, a?: unknown): Promise<Receipt> => {
      calls.push([p, m, a]);
      if (m === 'submit_turn') return { result: { response_turn_id: 'rt-1', turn_id: 't-1' } };
      return { result: { turn: { response_id: 'resp-1', content: { kind: 'user_response', message: 'ok', message_type: 'info' } } } };
    };
    let waited = '';
    const t = doorChatTransport({ call, conversationId: () => 'conv-1', waitForCommit: async (id) => void (waited = id) });
    const stream = await t.sendMessages({
      trigger: 'submit-message',
      chatId: 'conv-1',
      messageId: undefined,
      messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      abortSignal: undefined
    });
    const reader = stream.getReader();
    const got: string[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got.push(value.type);
    }
    expect(calls.map((c) => c[1])).toEqual(['submit_turn', 'get_turn_response']);
    expect(calls[0][2]).toEqual({ conversation_id: 'conv-1', message: 'hello', response_mode: 'application' });
    expect(waited).toBe('rt-1');
    expect(got).toContain('text-delta');
  });
});

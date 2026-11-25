import { describe, expect, it } from 'vitest';
import { Session, isRetryable } from './session';
import type { Door, Receipt } from '../door/types';
import type { Frame } from '../state/reducer';

function fakeDoor(turnCommittedAfter: number) {
  let reads = 0;
  const calls: string[] = [];
  const door: Door = {
    async callMethod(plugin, method): Promise<Receipt> {
      calls.push(`${plugin}.${method}`);
      if (method === 'get_catalog') return { result: { views: [{ view_id: 'v', source_catalog_hash: 'c1', source_catalog_generation: 1, plugins: [] }] } };
      if (method === 'list_components') return { result: { components: [{ name: 'Text', props_schema: {} }] } };
      if (method === 'get_turn_response') return { result: { turn: ++reads > turnCommittedAfter ? { content: { kind: 'user_response', message: 'ok' } } : null } };
      return { outcome: 'completed' };
    }
  };
  return { door, calls };
}

const frame = (plugin: string, gen: bigint, catalog = 'c1'): Frame => ({
  plugin_id: plugin, object_path: `/p/${plugin}`, kind: 'update', value: { n: Number(gen) }, catalog_hash: catalog, state_generation: gen
});

describe('session', () => {
  it('loads the catalog and sealed components, then applies the feed', async () => {
    const { door } = fakeDoor(0);
    const s = new Session(door, async function* () {
      yield frame('incus', 1n);
      yield frame('incus', 2n);
    });
    const ac = new AbortController();
    const done = s.run(ac.signal);
    await new Promise((r) => setTimeout(r, 10));
    ac.abort();
    await done;
    expect(s.catalog?.views[0].source_catalog_hash).toBe('c1');
    expect(s.components.map((c) => c.name)).toEqual(['Text']);
    expect(s.feeds.plugins.get('incus')?.paths.get('/p/incus')?.generation).toBe(2n);
  });

  it('waits for a commit only on chat_response frames, with no timer', async () => {
    const { door, calls } = fakeDoor(1);
    let push: ((f: Frame) => void) | undefined;
    const frames: Frame[] = [];
    const s = new Session(door, async function* () {
      for (;;) {
        const f = await new Promise<Frame>((r) => (push = r));
        frames.push(f);
        yield f;
      }
    });
    const ac = new AbortController();
    void s.run(ac.signal);
    await new Promise((r) => setTimeout(r, 5));
    const waiting = s.waitForCommit('rt-1');
    await new Promise((r) => setTimeout(r, 5));
    const readsBefore = calls.filter((c) => c.endsWith('get_turn_response')).length;
    push!(frame('incus', 3n)); // unrelated plugin: no re-read
    await new Promise((r) => setTimeout(r, 5));
    expect(calls.filter((c) => c.endsWith('get_turn_response')).length).toBe(readsBefore);
    push!(frame('chat_response', 4n)); // chat_response frame: re-read, committed now
    await waiting;
    ac.abort();
  });

  it('retries only transport unavailability or an expired proof', () => {
    expect(isRetryable({ code: 'UNAVAILABLE' })).toBe(true);
    expect(isRetryable({ code: 'PERMISSION_DENIED' })).toBe(false);
    expect(isRetryable(new Error('proof expired'))).toBe(true);
  });

  it('sets mode with project.select_context and model with chat_router.SetSelection', async () => {
    const { door, calls } = fakeDoor(0);
    const s = new Session(door, async function* () {});
    await s.selectContext('accountability');
    await s.setSelection('p', 'm');
    expect(calls).toEqual(['project.select_context', 'chat_router.SetSelection']);
  });
});

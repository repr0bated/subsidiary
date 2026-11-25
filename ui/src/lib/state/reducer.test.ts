import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { FeedReducer, type Frame } from './reducer';

const plugins = ['chat_router', 'incus', 'json_render'];
const paths = ['/org/opdbus/v1/plugins/x', '/org/opdbus/v1/plugins/x/a', '/org/opdbus/v1/plugins/x/a/b', '/org/opdbus/v1/plugins/x/c'];

const frameArb: fc.Arbitrary<Frame> = fc.record({
  plugin_id: fc.constantFrom(...plugins),
  object_path: fc.constantFrom(...paths),
  kind: fc.constantFrom('initial', 'update') as fc.Arbitrary<'initial' | 'update'>,
  value: fc.integer(),
  catalog_hash: fc.constant('c1'),
  state_generation: fc.bigInt({ min: 1n, max: 50n })
});

describe('property 2: newest generation wins', () => {
  it('each path holds the value of its highest generation, in any order, and never regresses', () => {
    fc.assert(
      fc.property(fc.array(frameArb, { maxLength: 60 }), (frames) => {
        const r = new FeedReducer();
        const best = new Map<string, Frame>();
        for (const f of frames) {
          const before = r.state.plugins.get(f.plugin_id)?.paths.get(f.object_path)?.generation;
          r.apply(f);
          const after = r.state.plugins.get(f.plugin_id)?.paths.get(f.object_path)?.generation;
          if (before !== undefined) expect(after! >= before).toBe(true);
          const k = `${f.plugin_id}|${f.object_path}`;
          const b = best.get(k);
          if (!b || f.state_generation >= b.state_generation) best.set(k, f);
        }
        for (const [k, f] of best) {
          const [p, path] = k.split('|');
          expect(r.state.plugins.get(p)?.paths.get(path)?.generation).toBe(f.state_generation);
        }
      }),
      { numRuns: 300 }
    );
  });
});

describe('property 3: tombstones stay removed', () => {
  it('removes the subtree and blocks lower-generation frames under it', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 2n, max: 100n }), fc.bigInt({ min: 1n, max: 100n }), (tomb, later) => {
        const r = new FeedReducer();
        const base = { plugin_id: 'p', kind: 'update' as const, catalog_hash: 'c1' };
        r.apply({ ...base, object_path: '/a/b', value: 1, state_generation: 1n });
        r.apply({ ...base, object_path: '/a', tombstone: true, state_generation: tomb });
        expect(r.state.plugins.get('p')?.paths.has('/a/b')).toBe(false);
        r.apply({ ...base, object_path: '/a/b', value: 2, state_generation: later });
        const present = r.state.plugins.get('p')?.paths.has('/a/b');
        expect(present).toBe(later > tomb);
      }),
      { numRuns: 300 }
    );
  });
});

describe('property 4: withheld never appears', () => {
  it('a path with no frame reads as absent', () => {
    fc.assert(
      fc.property(fc.array(frameArb, { maxLength: 30 }), fc.string(), (frames, missing) => {
        const r = new FeedReducer();
        frames.forEach((f) => r.apply(f));
        const sent = new Set(frames.map((f) => `${f.plugin_id}|${f.object_path}`));
        for (const p of plugins) {
          const path = '/withheld/' + missing;
          if (!sent.has(`${p}|${path}`)) expect(r.state.plugins.get(p)?.paths.has(path) ?? false).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });
});

describe('property 6: re-hydration is complete', () => {
  it('after reset nothing from before survives unless re-sent', () => {
    fc.assert(
      fc.property(fc.array(frameArb, { maxLength: 30 }), fc.array(frameArb, { maxLength: 30 }), (before, after) => {
        const r = new FeedReducer();
        before.forEach((f) => r.apply(f));
        r.reset();
        after.forEach((f) => r.apply(f));
        const resent = new Set(after.map((f) => `${f.plugin_id}|${f.object_path}`));
        for (const [p, feed] of r.state.plugins) for (const path of feed.paths.keys()) expect(resent.has(`${p}|${path}`)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});

describe('heartbeats', () => {
  it('carry no state', () => {
    const r = new FeedReducer();
    r.apply({ plugin_id: 'p', object_path: '/x', kind: 'heartbeat', catalog_hash: 'c2', state_generation: 9n });
    expect(r.state.plugins.size).toBe(0);
    expect(r.state.catalogHash).toBe('c2');
  });
});

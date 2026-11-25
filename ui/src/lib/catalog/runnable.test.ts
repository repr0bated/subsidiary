import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isRunnable, renderOperation, stripCapabilities } from './runnable';
import type { CatalogOperation } from '../door/types';

const CAP_KEYS = ['required_capability', 'capability', 'capabilities', 'capability_id', 'held_capabilities', 'grants', 'grant', 'currently_granted'];

const opArb = fc.record({
  method: fc.string({ minLength: 1 }),
  call_path: fc.string(),
  metadata_path: fc.string(),
  currently_granted: fc.boolean(),
  required_capability: fc.string(),
  side_effect: fc.constantFrom('read', 'mutation')
}) as fc.Arbitrary<CatalogOperation>;

function containsCapabilityKey(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(containsCapabilityKey);
  if (v && typeof v === 'object') {
    return Object.entries(v).some(([k, x]) => CAP_KEYS.includes(k.toLowerCase()) || containsCapabilityKey(x));
  }
  return false;
}

describe('property 5: runnable is exact and capability-free', () => {
  it('runnable equals currently_granted, and rendered output carries no capability', () => {
    fc.assert(
      fc.property(fc.array(opArb), (ops) => {
        const rendered = ops.map(renderOperation);
        rendered.forEach((r, i) => {
          expect(r.runnable).toBe(ops[i].currently_granted === true);
          expect(r.method).toBe(ops[i].method);
          expect(containsCapabilityKey(r)).toBe(false);
        });
        expect(rendered.filter((r) => r.runnable).length).toBe(ops.filter(isRunnable).length);
      }),
      { numRuns: 300 }
    );
  });

  it('strips capability keys at any depth', () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.constantFrom(...CAP_KEYS), fc.string(), (v, key, val) => {
        const nested = { a: { b: [{ [key]: val, keep: v }] }, [key]: val };
        expect(containsCapabilityKey(stripCapabilities(nested))).toBe(false);
      }),
      { numRuns: 300 }
    );
  });

  it('does not change its input', () => {
    const input = { required_capability: 'x', nested: { capability: 'y', keep: 1 } };
    const copy = structuredClone(input);
    stripCapabilities(input);
    expect(input).toEqual(copy);
  });
});

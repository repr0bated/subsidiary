import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { makeCaller, isOutcomeUnknown } from './call';
import type { Door, Receipt } from './types';

describe('property 1: action passthrough', () => {
  it('makes exactly one CallMethod with the same arguments and returns the receipt unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.jsonValue(),
        fc.record({ operation_id: fc.string(), outcome: fc.constantFrom('completed', 'outcome_unknown', 'refused') }),
        async (plugin, method, args, receipt) => {
          const calls: unknown[][] = [];
          const door: Door = {
            callMethod: async (...a) => {
              calls.push(a);
              return receipt as Receipt;
            }
          };
          const got = await makeCaller(door)(plugin, method, args);
          expect(calls).toEqual([[plugin, method, args]]);
          expect(got).toBe(receipt);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('never retries an unknown outcome', async () => {
    let n = 0;
    const door: Door = { callMethod: async () => (n++, { outcome: 'outcome_unknown' }) };
    const r = await makeCaller(door)('cognitive', 'agent_x_help', {});
    expect(isOutcomeUnknown(r)).toBe(true);
    expect(n).toBe(1);
  });
});

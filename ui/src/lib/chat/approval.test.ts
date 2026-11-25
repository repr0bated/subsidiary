import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { answerPending, readPending, showProposal } from './approval';
import type { Receipt } from '../door/types';

const proposal = { turn_id: 't1', tool_call_id: 'tc1', digest: 'd'.repeat(64), plugin_id: 'incus', method: 'start_instance',
  arguments: { name: 'x', required_capability: 'cap.never' }, required_capability: 'cap.never', expires_at: '2026-12-01T00:00:00Z' };

describe('approval', () => {
  it('answers with the backend digest and ids, unchanged, for approve and deny', async () => {
    await fc.assert(fc.asyncProperty(fc.boolean(), async (approved) => {
      const calls: unknown[][] = [];
      const call = async (...a: unknown[]): Promise<Receipt> => (calls.push(a), { outcome: 'completed' });
      await answerPending(call as never, proposal as never, approved);
      expect(calls).toEqual([['chat_response', 'approve_pending_tool', { turn_id: 't1', tool_call_id: 'tc1', digest: proposal.digest, approved }]]);
    }), { numRuns: 20 });
  });

  it('reads the pending proposal and shows it without capabilities', async () => {
    const call = async (): Promise<Receipt> => ({ result: { proposal } });
    const p = await readPending(call as never, 't1');
    expect(p?.digest).toBe(proposal.digest);
    const shown = showProposal(p!);
    expect(JSON.stringify(shown)).not.toContain('cap.never');
    expect(JSON.stringify(shown)).not.toContain(proposal.digest);
  });

  it('treats a missing proposal as none', async () => {
    const call = async (): Promise<Receipt> => ({ result: { proposal: null } });
    expect(await readPending(call as never, 't1')).toBeNull();
  });
});

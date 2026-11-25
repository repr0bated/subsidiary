import { describe, expect, it } from 'vitest';
import { searchOwnEvents, standQuestion } from './search';
import type { Receipt } from '../door/types';

const ev = (id: number, score: number) => ({ score, event: { event_id: id, event_hash: 'h' + id, prev_hash: 'h' + (id - 1), plugin_id: 'incus', method_name: 'start_instance', capability_id: 'cap.never.shown', actor_id: 'a' } });

describe('accountability search', () => {
  it('calls search_own_events once, sorts by score, and never shows capabilities', async () => {
    const calls: unknown[][] = [];
    const call = async (...a: unknown[]): Promise<Receipt> => (calls.push(a), { result: { matches: [ev(1, 0.2), ev(2, 0.9)] } });
    const found = await searchOwnEvents(call as never, '  the audit for the library  ', 50);
    expect(calls).toEqual([['snowball', 'search_own_events', { query: 'the audit for the library', limit: 20 }]]);
    expect(found.map((e) => e.event_id)).toEqual([2, 1]);
    expect(JSON.stringify(found)).not.toContain('cap.never.shown');
  });

  it('does not call for an empty query', async () => {
    let n = 0;
    expect(await searchOwnEvents(async () => (n++, {}), '   ')).toEqual([]);
    expect(n).toBe(0);
  });

  it('asks the chatbot to answer only from its receipts', () => {
    const q = standQuestion({ event_id: 7, event_hash: 'abc', prev_hash: '', plugin_id: 'p', method_name: 'm', score: 1 }, 'Who authorized it?');
    expect(q).toContain('event 7');
    expect(q).toContain('only from your own receipts');
  });
});

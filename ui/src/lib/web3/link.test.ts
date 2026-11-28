import { describe, expect, it } from 'vitest';
import type { Hex } from './client';
import { buildRecord } from './disclosure';
import { buildLink, checkLink, entryHash, ledgerPointId, type ChainEvent, type PublicRef } from './link';

const salt = (b: string) => `0x${b.repeat(32)}` as Hex;
const { entry } = buildRecord(
  { status: 'delivered', client: 'Ada Lovelace', design: { patent: 'pending' } },
  { status: 'none', client: 'private' },
  { salts: { client: salt('11'), design: salt('22'), status: salt('33') } }
);

// 2026-11-28T10:00:00Z
const T = 1_795_860_000;
const pub: PublicRef = {
  chainId: 31337,
  contract: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  recordId: 1,
  root: entry.root,
  txHash: salt('aa'),
  blockNumber: 7,
  blockHash: salt('bb'),
  blockTime: T
};
const event: ChainEvent = {
  event_id: 1024,
  event_hash: 'c'.repeat(64),
  timestamp: '2026-11-28T10:00:42.123Z'
};

describe('ledgerPointId', () => {
  it("matches op-cognitive's ledger_point_id (UUIDv5, Python uuid.uuid5 as reference)", async () => {
    // python3 -c "import uuid;print(uuid.uuid5(uuid.UUID('3c0b91e4-5a27-4d6f-8b12-e6f409d3a751'),'ledger:abc'))"
    expect(await ledgerPointId('abc')).toBe('0415f5fc-1672-5a0d-b073-3c7e8e46a6a8');
  });
});

describe('buildLink', () => {
  it('ties every id inside the bubble', async () => {
    const link = await buildLink(pub, event, entry);
    expect(link.bubble).toEqual({ opensAt: T - 5, closesAt: T + 300 });
    expect(link.hashchain).toEqual({ eventId: 1024, eventHash: 'c'.repeat(64), time: T + 42 });
    expect(link.vector.ledgerPointId).toBe(await ledgerPointId('c'.repeat(64)));
    expect(link.entryHash).toBe(entryHash(entry));
    expect(await checkLink(link, { pub, event, entry })).toEqual([]);
  });

  it('refuses an event outside the bubble', async () => {
    await expect(buildLink(pub, { ...event, timestamp: '2026-11-28T10:05:01Z' }, entry)).rejects.toThrow(/outside the bubble/);
    await expect(buildLink(pub, { ...event, timestamp: '2026-11-28T09:59:54Z' }, entry)).rejects.toThrow(/outside the bubble/);
    expect((await buildLink(pub, { ...event, timestamp: '2026-11-28T10:05:01Z' }, entry, { seconds: 600 })).bubble.closesAt).toBe(T + 600);
  });

  it('refuses an entry whose root is not the public root', async () => {
    await expect(buildLink({ ...pub, root: salt('dd') }, event, entry)).rejects.toThrow(/entry root differs/);
  });
});

describe('checkLink', () => {
  it('catches each side changing after the link was made', async () => {
    const link = await buildLink(pub, event, entry);
    expect(await checkLink(link, { pub: { ...pub, blockHash: salt('ee') } })).toEqual(['public chain says something else']);
    expect(await checkLink(link, { event: { ...event, event_hash: 'd'.repeat(64) } })).toEqual(['hash-chain event id or hash differs']);
    const e = structuredClone(entry);
    e.fields[1].value = { patent: 'granted' };
    expect(await checkLink(link, { entry: e })).toEqual(['entry differs from the one linked']);
    expect(await checkLink({ ...link, vector: { ledgerPointId: '00000000-0000-5000-8000-000000000000' } })).toEqual([
      'vector id is not the ledger point id of the event hash'
    ]);
  });
});

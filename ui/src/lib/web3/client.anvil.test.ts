import { describe, expect, it } from 'vitest';
import { RpcError, createChainReader } from './client';

/**
 * Opt-in: the read-only client against a real node, so the decoder is checked against real ABI
 * encoding and not only the mocked words in client.test.ts. Skipped unless WEB3_RPC_URL is set.
 * web3/script/e2e-local.sh sets every variable below after its deploy, anchor and hire steps.
 */
const env = import.meta.env;
const rpcUrl: string | undefined = env.WEB3_RPC_URL;
const need = (k: string): string => {
  const v: unknown = env[k];
  if (typeof v !== 'string' || v === '') throw new Error(`${k} is required when WEB3_RPC_URL is set`);
  return v;
};

describe.skipIf(!rpcUrl)('web3 client against a local anvil', () => {
  const hire = rpcUrl ? need('WEB3_HIRE') : '';
  const anchor = rpcUrl ? need('WEB3_ANCHOR').toLowerCase() : '';
  const head = rpcUrl ? need('WEB3_HEAD').toLowerCase() : '';
  const terms = rpcUrl ? need('WEB3_TERMS_HASH').toLowerCase() : '';
  const client = rpcUrl ? need('WEB3_CLIENT').toLowerCase() : '';
  const provider = rpcUrl ? need('WEB3_PROVIDER').toLowerCase() : '';
  const reader = () => createChainReader({ rpcUrl: rpcUrl!, hire });
  const unanchored = `0x${'ab'.repeat(32)}`;

  it('finds the anchor through the hire contract and counts one hire', async () => {
    const r = reader();
    expect(await r.anchorAddress()).toBe(anchor);
    expect(await r.hireCount()).toBe(1n);
  });

  it('decodes hire 1 as created, delivered and confirmed', async () => {
    const h = await reader().getHire(1);
    expect(h).toMatchObject({
      client, provider, termsHash: terms, workHead: head, warrantyPeriod: 604800n,
      status: 'Completed', clientConfirmed: true, providerConfirmed: true
    });
    expect(h.createdAt).toBeGreaterThan(0n);
    expect(h.acceptedAt).toBeGreaterThanOrEqual(h.createdAt);
    expect(h.deliveredAt).toBeGreaterThanOrEqual(h.acceptedAt);
    expect(h.completedAt).toBeGreaterThanOrEqual(h.deliveredAt);
  });

  it('reads the anchored head and an unanchored one', async () => {
    const r = reader();
    const a = await r.anchorOf(head);
    expect(a).toMatchObject({ head, anchored: true, anchoredBy: provider });
    expect(a.timestamp).toBeGreaterThan(0n);
    expect(await r.anchorOf(unanchored)).toEqual({
      head: unanchored, anchored: false, timestamp: 0n, anchoredBy: `0x${'0'.repeat(40)}`
    });
  });

  it('passes the real receipt and fails a wrong head', async () => {
    const r = reader();
    expect(await r.checkReceipt(head, 1)).toMatchObject({ ok: true, hire: { id: 1n, completed: true, matchesWorkHead: true } });
    expect(await r.checkReceipt(unanchored, 1)).toMatchObject({ ok: false, hire: { completed: true, matchesWorkHead: false } });
  });

  it('turns the revert for an unknown hire into RpcError', async () => {
    await expect(reader().getHire(2)).rejects.toBeInstanceOf(RpcError);
  });
});

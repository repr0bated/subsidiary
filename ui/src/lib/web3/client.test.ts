import { describe, expect, it } from 'vitest';
import { etchedAnchor, hireContract } from './abi';
import { RpcError, createChainReader, toBytes32 } from './client';

const HIRE = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const ANCHOR = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const CLIENT = '70997970c51812dc3a010c7d01b50e0d17dc79c8';
const PROVIDER = '3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
const HEAD = 'aa7f04a03c21ecd004601ff011248993dc9faf6d5b1d22d8b9b6a21cbd67393f';
const TERMS = 'ebe3e36984db84a065a57e1077ff963960b7564a377412ed2f2cf14f4d28eced';

const w = (v: bigint | number | string) => (typeof v === 'string' ? v.padStart(64, '0') : BigInt(v).toString(16).padStart(64, '0'));

function hireWords(status: number, workHead = HEAD): string {
  return '0x' + [w(CLIENT), w(PROVIDER), w(TERMS), w(workHead), w(604800), w(10), w(11), w(12), w(13), w(status), w(1), w(1)].join('');
}

/** A fake JSON-RPC node: answers eth_call by selector; records every request. */
function fakeRpc(answers: Record<string, (data: string) => unknown>) {
  const seen: { to: string; data: string }[] = [];
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const req = JSON.parse(String(init.body));
    expect(req.method).toBe('eth_call');
    const { to, data } = req.params[0];
    seen.push({ to, data });
    const answer = answers[data.slice(2, 10)];
    const body = answer ? answer(data) : { error: { message: 'execution reverted' } };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, ...(body as object) }));
  }) as typeof fetch;
  return { fetchFn, seen };
}

const sel = {
  getHire: hireContract.methods['getHire(uint256)'],
  anchor: hireContract.methods['anchor()'],
  anchorOf: etchedAnchor.methods['anchorOf(bytes32)']
};

describe('web3 read-only client', () => {
  it('pads a hash to bytes32 like anchor-head.sh and rejects junk', () => {
    expect(toBytes32(HEAD)).toBe(`0x${HEAD}`);
    expect(toBytes32('0xABCD')).toBe(`0x${'0'.repeat(60)}abcd`);
    expect(toBytes32('d41d8cd98f00b204e9800998ecf8427e')).toBe(`0x${'0'.repeat(32)}d41d8cd98f00b204e9800998ecf8427e`);
    expect(() => toBytes32('nothex')).toThrow();
    expect(() => toBytes32('a'.repeat(65))).toThrow();
  });

  it('rejects a bad contract address before any call', () => {
    expect(() => createChainReader({ rpcUrl: 'x', hire: '0x1234' })).toThrow('invalid hire address');
  });

  it('reads and decodes a hire', async () => {
    const { fetchFn, seen } = fakeRpc({ [sel.getHire]: () => ({ result: hireWords(5) }) });
    const h = await createChainReader({ rpcUrl: 'http://rpc', hire: HIRE, fetch: fetchFn }).getHire(1);
    expect(seen).toEqual([{ to: HIRE, data: `0x${sel.getHire}${w(1)}` }]);
    expect(h).toEqual({
      client: `0x${CLIENT}`, provider: `0x${PROVIDER}`, termsHash: `0x${TERMS}`, workHead: `0x${HEAD}`,
      warrantyPeriod: 604800n, createdAt: 10n, acceptedAt: 11n, deliveredAt: 12n, completedAt: 13n,
      status: 'Completed', clientConfirmed: true, providerConfirmed: true
    });
  });

  it('turns a revert into RpcError', async () => {
    const { fetchFn } = fakeRpc({});
    await expect(createChainReader({ rpcUrl: 'http://rpc', hire: HIRE, fetch: fetchFn }).getHire(9)).rejects.toBeInstanceOf(RpcError);
  });

  it('finds the anchor through the hire contract and reads an anchored head', async () => {
    const { fetchFn, seen } = fakeRpc({
      [sel.anchor]: () => ({ result: '0x' + w(ANCHOR.slice(2)) }),
      [sel.anchorOf]: () => ({ result: '0x' + w(1795833450) + w(PROVIDER) })
    });
    const r = createChainReader({ rpcUrl: 'http://rpc', hire: HIRE, fetch: fetchFn });
    const a = await r.anchorOf(HEAD);
    expect(a).toEqual({ head: `0x${HEAD}`, anchored: true, timestamp: 1795833450n, anchoredBy: `0x${PROVIDER}` });
    expect(seen[1]).toEqual({ to: ANCHOR, data: `0x${sel.anchorOf}${HEAD}` });
    await r.anchorOf(HEAD);
    expect(seen.filter((s) => s.data === `0x${sel.anchor}`)).toHaveLength(1);
  });

  it('passes a receipt only when anchored, completed and equal to the work head', async () => {
    const run = async (anchoredAt: number, status: number, workHead: string) => {
      const { fetchFn } = fakeRpc({
        [sel.anchorOf]: () => ({ result: '0x' + w(anchoredAt) + w(anchoredAt ? PROVIDER : '0') }),
        [sel.getHire]: () => ({ result: hireWords(status, workHead) })
      });
      return createChainReader({ rpcUrl: 'http://rpc', hire: HIRE, anchor: ANCHOR, fetch: fetchFn }).checkReceipt(HEAD, 1);
    };
    expect((await run(5, 5, HEAD)).ok).toBe(true);
    expect((await run(0, 5, HEAD)).ok).toBe(false);
    expect((await run(5, 4, HEAD)).hire).toEqual({ id: 1n, completed: false, matchesWorkHead: true });
    expect((await run(5, 5, 'ff'.repeat(32))).hire?.matchesWorkHead).toBe(false);
  });

  it('checks a bare head without a hire', async () => {
    const { fetchFn } = fakeRpc({ [sel.anchorOf]: () => ({ result: '0x' + w(0) + w(0) }) });
    const c = await createChainReader({ rpcUrl: 'http://rpc', hire: HIRE, anchor: ANCHOR, fetch: fetchFn }).checkReceipt(HEAD);
    expect(c).toMatchObject({ anchored: false, ok: false });
    expect(c.hire).toBeUndefined();
  });
});

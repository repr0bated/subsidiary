import { describe, expect, it, vi } from 'vitest';
import { etchedAnchor, hireContract } from './abi';
import { loadHireCard, readWeb3Config } from './hire-card';

const HIRE = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const ANCHOR = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const HEAD = 'aa7f04a03c21ecd004601ff011248993dc9faf6d5b1d22d8b9b6a21cbd67393f';
const TERMS = 'ebe3e36984db84a065a57e1077ff963960b7564a377412ed2f2cf14f4d28eced';
const w = (v: bigint | number | string) => (typeof v === 'string' ? v.padStart(64, '0') : BigInt(v).toString(16).padStart(64, '0'));
const hireWords = (status: number) =>
  '0x' + ['70997970c51812dc3a010c7d01b50e0d17dc79c8', '3c44cdddb6a900fa2b585dd299e03d12fa4293bc', TERMS, HEAD, 604800, 10, 11, 12, 13, status, 1, 1].map(w).join('');

const sel = {
  hireCount: hireContract.methods['hireCount()'],
  getHire: hireContract.methods['getHire(uint256)'],
  anchor: hireContract.methods['anchor()'],
  anchorOf: etchedAnchor.methods['anchorOf(bytes32)']
};

/** A fake JSON-RPC node answering eth_call by selector. */
function fakeRpc(opts: { count?: number; status?: number; anchoredAt?: number }) {
  const answers: Record<string, string> = {
    [sel.hireCount]: '0x' + w(opts.count ?? 1),
    [sel.getHire]: hireWords(opts.status ?? 5),
    [sel.anchor]: '0x' + w(ANCHOR.slice(2)),
    [sel.anchorOf]: '0x' + w(opts.anchoredAt ?? 0) + w(opts.anchoredAt ? '3c44cdddb6a900fa2b585dd299e03d12fa4293bc' : 0)
  };
  return vi.fn(async (_url: string, init: RequestInit) => {
    const req = JSON.parse(String(init.body));
    const result = answers[req.params[0].data.slice(2, 10)];
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: req.id, ...(result ? { result } : { error: { message: 'execution reverted' } }) }));
  });
}

const on = { PUBLIC_WEB3_RPC_URL: 'http://127.0.0.1:8546', PUBLIC_WEB3_HIRE_ADDRESS: HIRE };

describe('hire card draft config', () => {
  it('is off with no config, and nothing is fetched', () => {
    const f = vi.spyOn(globalThis, 'fetch');
    expect(readWeb3Config({})).toBeNull();
    expect(readWeb3Config({ PUBLIC_WEB3_RPC_URL: '  ', PUBLIC_WEB3_HIRE_ADDRESS: HIRE })).toBeNull();
    expect(f).not.toHaveBeenCalled();
    f.mockRestore();
  });

  it('reads the config and refuses a half or wrong one', () => {
    expect(readWeb3Config({ ...on, PUBLIC_WEB3_HIRE_ID: '2' })).toEqual({ rpcUrl: on.PUBLIC_WEB3_RPC_URL, hire: HIRE, anchor: undefined, hireId: 2n, head: undefined });
    expect(() => readWeb3Config({ PUBLIC_WEB3_RPC_URL: on.PUBLIC_WEB3_RPC_URL })).toThrow('PUBLIC_WEB3_HIRE_ADDRESS');
    expect(() => readWeb3Config({ ...on, PUBLIC_WEB3_RPC_URL: 'file:///etc/passwd' })).toThrow('http(s)');
    expect(() => readWeb3Config({ ...on, PUBLIC_WEB3_HIRE_ID: '0' })).toThrow('positive integer');
  });
});

describe('hire card draft data (mocked RPC)', () => {
  it('shows the latest hire as Completed, anchored, receipt pass', async () => {
    const f = fakeRpc({ anchoredAt: 1795838912 });
    const v = await loadHireCard(readWeb3Config(on)!, f as unknown as typeof fetch);
    expect(v).toEqual({ hireId: 1n, status: 'Completed', termsHash: `0x${TERMS}`, workHead: `0x${HEAD}`, anchored: true, anchoredAt: 1795838912n, receiptOk: true });
    expect(f.mock.calls.every(([url]) => url === on.PUBLIC_WEB3_RPC_URL)).toBe(true);
  });

  it('shows not anchored and receipt fail when the head is not on the record', async () => {
    const v = await loadHireCard(readWeb3Config(on)!, fakeRpc({ anchoredAt: 0 }) as unknown as typeof fetch);
    expect(v).toMatchObject({ status: 'Completed', anchored: false, receiptOk: false });
  });

  it('fails the receipt check for a hire that is not Completed, or a different head', async () => {
    expect(await loadHireCard(readWeb3Config(on)!, fakeRpc({ status: 4, anchoredAt: 5 }) as unknown as typeof fetch)).toMatchObject({ status: 'Delivered', anchored: true, receiptOk: false });
    const other = readWeb3Config({ ...on, PUBLIC_WEB3_RECEIPT_HEAD: 'ab'.repeat(32) })!;
    expect(await loadHireCard(other, fakeRpc({ anchoredAt: 5 }) as unknown as typeof fetch)).toMatchObject({ anchored: true, receiptOk: false });
  });

  it('returns null when the contract has no hire yet', async () => {
    expect(await loadHireCard(readWeb3Config(on)!, fakeRpc({ count: 0 }) as unknown as typeof fetch)).toBeNull();
  });
});

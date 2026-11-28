import { describe, expect, it } from 'vitest';
import {
  buildRecord,
  bundleHash,
  bundleText,
  foldProof,
  leafHash,
  nodeHash,
  revealField,
  valueHash,
  verifyBundle,
  verifyEntry,
  verifyReveal,
  type PublicBundle
} from './disclosure';
import type { Hex } from './client';

// Shared test vector. web3/test/EtchedRecord.t.sol rebuilds the same tree in Solidity and must get
// the same root, so the contract and this module agree byte for byte.
const salt = (b: string) => `0x${b.repeat(32)}` as Hex;
const record = { status: 'delivered', client: 'Ada Lovelace', design: { patent: 'pending' } };
const classes = { status: 'none', client: 'private' } as const;
const salts = { client: salt('11'), design: salt('22'), status: salt('33') };
const ROOT = '0x99e2f8cc8681e2b207d3b8862993558ddbbb031bbd4f8cde53ddc5875911591d';

describe('buildRecord', () => {
  const { root, bundle, entry } = buildRecord(record, classes, { salts });

  it('gives the shared test vector root', () => {
    expect(root).toBe(ROOT);
    expect(bundle.root).toBe(ROOT);
    expect(entry.root).toBe(ROOT);
  });

  it('shows none, redacts private, withholds secret and unclassified', () => {
    expect(bundle.fields.map((f) => [f.path, f.class])).toEqual([
      ['client', 'redacted'],
      ['status', 'public']
    ]);
    expect(bundle.withheld).toBe(1);
    const text = bundleText(bundle);
    expect(text).not.toContain('Ada Lovelace');
    expect(text).not.toContain('design');
    expect(text).not.toContain('patent');
    expect(text).not.toContain(salt('11'));
    expect(text).toContain('"value":"delivered"');
  });

  it('keeps everything, salts included, in the hash-chain entry', () => {
    expect(entry.fields.map((f) => [f.path, f.class, f.value])).toEqual([
      ['client', 'redacted', 'Ada Lovelace'],
      ['design', 'withheld', { patent: 'pending' }],
      ['status', 'public', 'delivered']
    ]);
    expect(entry.fields.every((f) => /^0x[0-9a-f]{64}$/.test(f.salt))).toBe(true);
  });

  it('verifies, bundle on its own and entry against bundle', () => {
    expect(verifyBundle(bundle)).toEqual([]);
    expect(verifyEntry(entry, bundle)).toEqual([]);
  });

  it('is deterministic for fixed salts and random otherwise', () => {
    expect(buildRecord(record, classes, { salts }).root).toBe(ROOT);
    const a = buildRecord(record, classes);
    const b = buildRecord(record, classes);
    expect(a.root).not.toBe(b.root);
    expect(verifyEntry(a.entry, a.bundle)).toEqual([]);
  });

  it('changes the root when a withheld value changes', () => {
    const changed = buildRecord({ ...record, design: { patent: 'granted' } }, classes, { salts });
    expect(changed.root).not.toBe(ROOT);
  });

  it('refuses an unknown protection floor and an empty record', () => {
    expect(() => buildRecord(record, { status: 'public' as never })).toThrow();
    expect(() => buildRecord({}, {})).toThrow();
  });
});

describe('verifyBundle', () => {
  const { bundle } = buildRecord(record, classes, { salts });
  const copy = (): PublicBundle => JSON.parse(bundleText(bundle));

  it('catches a changed public value', () => {
    const b = copy();
    const f = b.fields.find((x) => x.path === 'status');
    if (f?.class === 'public') f.value = 'cancelled';
    expect(verifyBundle(b)).toEqual(['field status does not prove into the root']);
  });

  it('catches a swapped redacted leaf and a different root', () => {
    const b = copy();
    const f = b.fields.find((x) => x.path === 'client');
    if (f?.class === 'redacted') f.leaf = salt('ab');
    expect(verifyBundle(b)).toEqual(['field client does not prove into the root']);
    expect(verifyBundle({ ...copy(), root: salt('cd') })).toHaveLength(2);
  });

  it('hashes the exact published text', () => {
    expect(bundleHash(copy())).toBe(bundleHash(bundle));
  });
});

describe('verifyEntry', () => {
  const { entry, bundle } = buildRecord(record, classes, { salts });

  it('catches a changed withheld value', () => {
    const e = structuredClone(entry);
    e.fields[1].value = { patent: 'granted' };
    expect(verifyEntry(e)).toEqual(['field design: value and salt do not give its leaf']);
  });

  it('catches a bundle that shows a withheld field', () => {
    const b: PublicBundle = structuredClone(bundle);
    b.fields.push({ path: 'design', class: 'public', value: { patent: 'pending' }, salt: salt('22'), proof: [] });
    b.withheld = 0;
    expect(verifyEntry(entry, b)).toEqual(['bundle shows design as public, entry says withheld', 'bundle says 0 withheld, entry has 1']);
  });

  it('catches a bundle that drops a redacted field', () => {
    const b: PublicBundle = structuredClone(bundle);
    b.fields = b.fields.filter((f) => f.path !== 'client');
    expect(verifyEntry(entry, b)).toEqual(['bundle leaves out redacted field client']);
  });
});

describe('revealField', () => {
  const { entry } = buildRecord(record, classes, { salts });

  it('proves a withheld field to someone, off the public chain', () => {
    const r = revealField(entry, 'design');
    expect(verifyReveal(ROOT, r)).toBe(true);
    expect(verifyReveal(ROOT, { ...r, value: { patent: 'granted' } })).toBe(false);
  });
});

describe('tree encoding', () => {
  it('sorts node children and separates leaves from nodes', () => {
    const a = salt('01');
    const b = salt('02');
    expect(nodeHash(a, b)).toBe(nodeHash(b, a));
    expect(leafHash('x', a, b)).not.toBe(nodeHash(a, b));
    expect(foldProof(a, [])).toBe(a);
  });

  it('hashes values as canonical JSON', () => {
    expect(valueHash({ b: 1, a: [2] })).toBe(valueHash({ a: [2], b: 1 }));
  });
});

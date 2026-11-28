import type { Hex } from './client';
import { keccak256 } from './keccak';
import { canonicalJson } from './terms';

/**
 * Public record, private detail. A record starts on the public chain (web3/src/EtchedRecord.sol)
 * as one root over all of its fields; 3tched's hash chain then holds the full record with every
 * salt, so any field can be proven against the public root later without the public chain ever
 * holding it.
 *
 * What shows publicly comes from 3tched's own field classification
 * (`oscal_subid_registry.assess_fields`, its `protection_floor` per field):
 *   none    -> public    value and salt in the bundle, anyone can check it against the root
 *   private -> redacted  only the field's name and salted leaf hash in the bundle
 *   secret  -> withheld  nowhere in the bundle; only inside the root (counted, not named)
 * A field with no classification is withheld. Nothing is shown unless 3tched says it may be.
 *
 * Encoding, identical to EtchedRecord.sol:
 *   leaf = keccak256(0x00 || keccak256(path) || salt || keccak256(canonicalJson(value)))
 *   node = keccak256(0x01 || min(a, b) || max(a, b))
 * Leaves are ordered by path (UTF-8 bytes), paired left to right, an odd last node is carried up.
 * Salts are 32 random bytes per field, so a redacted name or birth date cannot be guessed back
 * from its leaf. Values must be JSON with safe-integer numbers (see canonicalJson in ./terms).
 */

export type ProtectionFloor = 'none' | 'private' | 'secret';
export type FieldClass = 'public' | 'redacted' | 'withheld';

/** Protection floor per top-level field, from 3tched's field classification. */
export type Classification = Record<string, ProtectionFloor>;

export const CLASS_OF: Record<ProtectionFloor, FieldClass> = { none: 'public', private: 'redacted', secret: 'withheld' };

export const BUNDLE_VERSION = 'subsidiary.record/1';
export const ENTRY_VERSION = 'subsidiary.record-entry/1';

/** One field as the hash chain keeps it: everything, including withheld values and salts. */
export interface EntryField {
  path: string;
  class: FieldClass;
  value: unknown;
  salt: Hex;
  leaf: Hex;
}

/** The private side. It belongs on 3tched's hash chain only, never on the public chain. */
export interface RecordEntry {
  version: typeof ENTRY_VERSION;
  root: Hex;
  fields: EntryField[];
}

export type BundleField =
  | { path: string; class: 'public'; value: unknown; salt: Hex; proof: Hex[] }
  | { path: string; class: 'redacted'; leaf: Hex; proof: Hex[] };

/** The public side, published as canonical JSON with EtchedRecord.publish. */
export interface PublicBundle {
  version: typeof BUNDLE_VERSION;
  root: Hex;
  fields: BundleField[];
  /** How many fields are inside the root but not shown at all. */
  withheld: number;
}

const HEX32 = /^0x[0-9a-f]{64}$/;
const utf8 = new TextEncoder();

export function hexToBytes(hex: string): Uint8Array {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(hex)) throw new Error(`not hex bytes: ${hex}`);
  const out = new Uint8Array((hex.length - 2) / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 + 2 * i, 4 + 2 * i), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): Hex {
  let s = '0x';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s as Hex;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function bytes32(hex: string, what: string): Uint8Array {
  if (!HEX32.test(hex)) throw new Error(`${what} must be 32 bytes of lowercase hex`);
  return hexToBytes(hex);
}

/** keccak256 of the value's canonical JSON. */
export function valueHash(value: unknown): Hex {
  return keccak256(canonicalJson(value));
}

/** The leaf for one field, as EtchedRecord.leafHash computes it. */
export function leafHash(path: string, salt: Hex, vHash: Hex): Hex {
  return keccak256(concat(new Uint8Array([0x00]), hexToBytes(keccak256(path)), bytes32(salt, 'salt'), bytes32(vHash, 'value hash')));
}

/** The inner node over two children, in sorted order, as EtchedRecord.nodeHash computes it. */
export function nodeHash(a: Hex, b: Hex): Hex {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return keccak256(concat(new Uint8Array([0x01]), bytes32(lo, 'node'), bytes32(hi, 'node')));
}

/** Fold a proof from a leaf up to a root, as EtchedRecord.verifyLeaf does. */
export function foldProof(leaf: Hex, proof: Hex[]): Hex {
  return proof.reduce<Hex>((h, sibling) => nodeHash(h, sibling), leaf);
}

/** Every level of the tree, leaves first, root last. */
function levels(leaves: Hex[]): Hex[][] {
  if (leaves.length === 0) throw new Error('a record needs at least one field');
  const out: Hex[][] = [leaves];
  while (out[out.length - 1].length > 1) {
    const cur = out[out.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(i + 1 < cur.length ? nodeHash(cur[i], cur[i + 1]) : cur[i]);
    out.push(next);
  }
  return out;
}

function proofOf(tree: Hex[][], index: number): Hex[] {
  const proof: Hex[] = [];
  for (let level = 0; level < tree.length - 1; level++) {
    const sibling = index ^ 1;
    if (sibling < tree[level].length) proof.push(tree[level][sibling]);
    index >>= 1;
  }
  return proof;
}

function byUtf8(a: string, b: string): number {
  const x = utf8.encode(a);
  const y = utf8.encode(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

export function randomSalt(): Hex {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return bytesToHex(b);
}

export interface BuildOptions {
  /** Fixed salts per path, for tests and test vectors. Missing paths get random salts. */
  salts?: Record<string, Hex>;
}

/** Split a record into its public bundle and its private hash-chain entry, sharing one root. */
export function buildRecord(
  record: Record<string, unknown>,
  classification: Classification,
  opts: BuildOptions = {}
): { root: Hex; bundle: PublicBundle; entry: RecordEntry } {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) throw new Error('a record is a JSON object');
  for (const [path, floor] of Object.entries(classification)) {
    if (!(floor in CLASS_OF)) throw new Error(`unknown protection floor for ${path}: ${String(floor)}`);
  }
  const paths = Object.keys(record).sort(byUtf8);
  const fields: EntryField[] = paths.map((path) => {
    if (path.length === 0) throw new Error('a field name may not be empty');
    const floor = Object.hasOwn(classification, path) ? classification[path] : 'secret';
    const salt = opts.salts?.[path] ?? randomSalt();
    const value = record[path];
    return { path, class: CLASS_OF[floor], value, salt, leaf: leafHash(path, salt, valueHash(value)) };
  });
  const tree = levels(fields.map((f) => f.leaf));
  const root = tree[tree.length - 1][0];
  const shown: BundleField[] = [];
  fields.forEach((f, i) => {
    const proof = proofOf(tree, i);
    if (f.class === 'public') shown.push({ path: f.path, class: 'public', value: f.value, salt: f.salt, proof });
    else if (f.class === 'redacted') shown.push({ path: f.path, class: 'redacted', leaf: f.leaf, proof });
  });
  return {
    root,
    bundle: { version: BUNDLE_VERSION, root, fields: shown, withheld: fields.filter((f) => f.class === 'withheld').length },
    entry: { version: ENTRY_VERSION, root, fields }
  };
}

/** The exact text that is published and whose keccak256 EtchedRecord keeps as bundleHash. */
export function bundleText(bundle: PublicBundle): string {
  return canonicalJson(bundle);
}

export function bundleHash(bundle: PublicBundle): Hex {
  return keccak256(bundleText(bundle));
}

/** Check a public bundle on its own: every shown or redacted field proves into its root. */
export function verifyBundle(bundle: PublicBundle): string[] {
  const problems: string[] = [];
  if (bundle?.version !== BUNDLE_VERSION) return [`unknown bundle version ${String(bundle?.version)}`];
  if (!HEX32.test(bundle.root)) problems.push('root is not 32 bytes of lowercase hex');
  if (!Number.isSafeInteger(bundle.withheld) || bundle.withheld < 0) problems.push('withheld is not a count');
  const seen = new Set<string>();
  for (const f of bundle.fields ?? []) {
    if (seen.has(f.path)) problems.push(`field ${f.path} appears twice`);
    seen.add(f.path);
    try {
      const leaf = f.class === 'public' ? leafHash(f.path, f.salt, valueHash(f.value)) : f.class === 'redacted' ? f.leaf : null;
      if (leaf === null) problems.push(`field ${f.path} has unknown class`);
      else if (foldProof(leaf, f.proof) !== bundle.root) problems.push(`field ${f.path} does not prove into the root`);
    } catch (e) {
      problems.push(`field ${f.path}: ${(e as Error).message}`);
    }
  }
  return problems;
}

/**
 * Check the hash chain's entry against the public root, and, given the bundle, that the bundle
 * shows exactly what the entry says may be shown and nothing withheld.
 */
export function verifyEntry(entry: RecordEntry, bundle?: PublicBundle): string[] {
  const problems: string[] = [];
  if (entry?.version !== ENTRY_VERSION) return [`unknown entry version ${String(entry?.version)}`];
  const fields = [...entry.fields];
  const sorted = [...fields].sort((a, b) => byUtf8(a.path, b.path));
  if (fields.some((f, i) => f.path !== sorted[i].path)) problems.push('entry fields are not in path order');
  if (new Set(fields.map((f) => f.path)).size !== fields.length) problems.push('entry has a field twice');
  for (const f of fields) {
    try {
      if (leafHash(f.path, f.salt, valueHash(f.value)) !== f.leaf) problems.push(`field ${f.path}: value and salt do not give its leaf`);
    } catch (e) {
      problems.push(`field ${f.path}: ${(e as Error).message}`);
    }
  }
  if (problems.length) return problems;
  const tree = levels(fields.map((f) => f.leaf));
  if (tree[tree.length - 1][0] !== entry.root) problems.push('entry fields do not give the entry root');
  if (!bundle) return problems;

  if (bundle.root !== entry.root) problems.push('bundle root differs from entry root');
  const byPath = new Map(fields.map((f) => [f.path, f]));
  for (const b of bundle.fields ?? []) {
    const f = byPath.get(b.path);
    if (!f) {
      problems.push(`bundle shows ${b.path}, which the entry does not have`);
      continue;
    }
    if (f.class !== b.class) problems.push(`bundle shows ${b.path} as ${b.class}, entry says ${f.class}`);
    if (b.class === 'public' && (canonicalJson(b.value) !== canonicalJson(f.value) || b.salt !== f.salt)) {
      problems.push(`bundle value for ${b.path} differs from the entry`);
    }
    if (b.class === 'redacted' && b.leaf !== f.leaf) problems.push(`bundle leaf for ${b.path} differs from the entry`);
  }
  const shownPaths = new Set((bundle.fields ?? []).map((b) => b.path));
  for (const f of fields) {
    if (f.class !== 'withheld' && !shownPaths.has(f.path)) problems.push(`bundle leaves out ${f.class} field ${f.path}`);
  }
  const withheld = fields.filter((f) => f.class === 'withheld').length;
  if (bundle.withheld !== withheld) problems.push(`bundle says ${bundle.withheld} withheld, entry has ${withheld}`);
  return problems;
}

/** Hand one field, with its proof, to someone who should see it. This never touches the public chain. */
export function revealField(entry: RecordEntry, path: string): { path: string; value: unknown; salt: Hex; proof: Hex[] } {
  const index = entry.fields.findIndex((f) => f.path === path);
  if (index < 0) throw new Error(`no field ${path}`);
  const tree = levels(entry.fields.map((f) => f.leaf));
  const f = entry.fields[index];
  return { path, value: f.value, salt: f.salt, proof: proofOf(tree, index) };
}

/** Check a revealed field against a public root. */
export function verifyReveal(root: Hex, reveal: { path: string; value: unknown; salt: Hex; proof: Hex[] }): boolean {
  return foldProof(leafHash(reveal.path, reveal.salt, valueHash(reveal.value)), reveal.proof) === root;
}

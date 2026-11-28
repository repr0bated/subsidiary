import type { Hex } from './client';
import { keccak256 } from './keccak';

/**
 * The terms hash a hire stores, computed the way web3/script/verify-hire.sh and e2e-local.sh do:
 * `cast keccak "$(jq -S -c . terms.json)"`, i.e. Keccak-256 of the UTF-8 canonical JSON with keys
 * sorted at every depth, compact, no trailing newline.
 */

const utf8 = new TextEncoder();

/** jq sorts object keys by UTF-8 bytes (code point order), not by UTF-16 units as Array.sort does. */
function byUtf8(a: string, b: string): number {
  const x = utf8.encode(a);
  const y = utf8.encode(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** jq writes U+007F as \u007f; JSON.stringify leaves it raw. Other escapes already match. */
const str = (s: string): string => JSON.stringify(s).replace(/\u007f/g, '\\u007f');

/**
 * `jq -S -c .` output for a parsed JSON value.
 * shortcut: numbers must be safe integers. jq 1.7 keeps a number's literal text (1.0, 1E+3),
 * which JSON.parse has already lost, so any other number throws instead of hashing wrong;
 * hash the raw text with a literal-preserving parser if terms ever need non-integer numbers.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('terms numbers must be safe integers');
    return String(value);
  }
  if (typeof value === 'string') return str(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort(byUtf8).map((k) => `${str(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  throw new Error(`not a JSON value: ${typeof value}`);
}

/** The bytes32 termsHash HireContract stores for this terms document (object or JSON text). */
export function termsHash(terms: unknown): Hex {
  return keccak256(canonicalJson(typeof terms === 'string' ? JSON.parse(terms) : terms));
}

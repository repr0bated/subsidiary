import { describe, expect, it } from 'vitest';
import { canonicalJson, termsHash } from './terms';

// The fixed terms document from web3/script/e2e-local.sh. Its hash came from
// `cast keccak "$(jq -S -c . terms.json)"` on vps, the same command the script runs.
const e2eTerms = {
  version: 'subsidiary.terms/1',
  task: 'e2e-local fixed test hire',
  warranty_seconds: 604800,
  salt: '6b69726f7765656e2d6532652d6c6f63616c2d66697865642d73616c742d3031'
};
const e2eHash = '0xebe3e36984db84a065a57e1077ff963960b7564a377412ed2f2cf14f4d28eced';

describe('canonicalJson (jq -S -c .)', () => {
  it('sorts keys at every depth, compact', () => {
    expect(canonicalJson(e2eTerms)).toBe(
      '{"salt":"6b69726f7765656e2d6532652d6c6f63616c2d66697865642d73616c742d3031","task":"e2e-local fixed test hire","version":"subsidiary.terms/1","warranty_seconds":604800}'
    );
  });

  it('matches jq 1.7 on escapes and non-ASCII key order', () => {
    // Expected text is jq 1.7 output on vps for the same document.
    const doc = { b: '\u007f\u0001/\u2028', 'é': 1, z: 2, c: [{ y: 1, x: 2 }], '\uE000': 0, '😀': 0 };
    expect(canonicalJson(doc)).toBe('{"b":"\\u007f\\u0001/\u2028","c":[{"x":2,"y":1}],"z":2,"é":1,"\uE000":0,"😀":0}');
  });

  it('refuses numbers jq would print differently', () => {
    for (const n of [1.5, 1e21, -0, Number.MAX_SAFE_INTEGER + 1]) expect(() => canonicalJson({ n })).toThrow();
  });
});

describe('termsHash', () => {
  it('equals the e2e hire terms hash, from an object or JSON text', () => {
    expect(termsHash(e2eTerms)).toBe(e2eHash);
    expect(termsHash(JSON.stringify(e2eTerms, null, 2))).toBe(e2eHash);
  });

  it('changes when the terms change', () => {
    expect(termsHash({ ...e2eTerms, task: 'changed' })).not.toBe(e2eHash);
  });
});

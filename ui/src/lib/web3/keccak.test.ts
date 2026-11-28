import { describe, expect, it } from 'vitest';
import { keccak256 } from './keccak';

// Expected values: the first two are the standard Ethereum vectors; the rest came from
// `cast keccak` (Foundry) on vps, around the 136-byte block edge and past it.
const a = (n: number) => 'a'.repeat(n);
const fox = 'The quick brown fox jumps over the lazy dog. '.repeat(7) + ' Ünïcödé ✓ 🦀';

describe('keccak256 (Ethereum, 0x01 padding)', () => {
  it.each([
    ['empty', '', '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'],
    ['abc', 'abc', '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45'],
    ['135 bytes', a(135), '0x34367dc248bbd832f4e3e69dfaac2f92638bd0bbd18f2912ba4ef454919cf446'],
    ['136 bytes', a(136), '0xa6c4d403279fe3e0af03729caada8374b5ca54d8065329a3ebcaeb4b60aa386e'],
    ['137 bytes', a(137), '0xd869f639c7046b4929fc92a4d988a8b22c55fbadb802c0c66ebcd484f1915f39'],
    ['272 bytes', a(272), '0xcf7fcd4f705ee749930d19ca84561a9bf62516bd90a471545fa2f49fdc7e63c8'],
    ['336 UTF-8 bytes', fox, '0xa6e6f865bf961cb9090bfb1a928e3e9364ae811b06c02b211e4320926810a6a8']
  ])('%s', (_, input, want) => {
    expect(keccak256(input)).toBe(want);
  });

  it('hashes bytes the same as their string', () => {
    expect(keccak256(new TextEncoder().encode(fox))).toBe(keccak256(fox));
  });

  it('is not SHA3-256', () => {
    // SHA3-256('') = a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a
    expect(keccak256('')).not.toBe('0xa7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
  });
});

/**
 * Keccak-256 as Ethereum uses it (original Keccak padding 0x01, NOT SHA3-256's 0x06), in plain
 * TypeScript with no dependency. Rate 136 bytes, capacity 512 bits, 24 rounds of Keccak-f[1600].
 * shortcut: 64-bit lanes as BigInt are slow (fine for terms documents and heads of a few KB);
 * switch to 32-bit lane pairs if the canvas ever hashes large inputs.
 */

import type { Hex } from './client';

const MASK = (1n << 64n) - 1n;
const RATE = 136;

/** Round constants from the Keccak LFSR (x^8 + x^6 + x^5 + x^4 + 1). */
const RC: bigint[] = (() => {
  const out: bigint[] = [];
  let r = 1;
  for (let round = 0; round < 24; round++) {
    let c = 0n;
    for (let j = 0; j < 7; j++) {
      if (r & 1) c |= 1n << BigInt((1 << j) - 1);
      r = r & 0x80 ? ((r << 1) ^ 0x71) & 0xff : (r << 1) & 0xff;
    }
    out.push(c);
  }
  return out;
})();

/** Rho offsets and pi order, walked as (x, y) -> (y, 2x + 3y). */
const RHO: number[] = [];
const PI: number[] = [];
for (let t = 0, x = 1, y = 0; t < 24; t++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  PI.push(x + 5 * y);
  RHO.push((((t + 1) * (t + 2)) / 2) % 64);
}

const rotl = (v: bigint, n: number): bigint => (n === 0 ? v : ((v << BigInt(n)) | (v >> BigInt(64 - n))) & MASK);

function permute(a: bigint[]): void {
  const c = new Array<bigint>(5);
  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) c[x] = a[x] ^ a[x + 5] ^ a[x + 10] ^ a[x + 15] ^ a[x + 20];
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) a[x + y] ^= d;
    }
    let cur = a[1];
    for (let t = 0; t < 24; t++) {
      const tmp = a[PI[t]];
      a[PI[t]] = rotl(cur, RHO[t]);
      cur = tmp;
    }
    for (let y = 0; y < 25; y += 5) {
      const row = a.slice(y, y + 5);
      for (let x = 0; x < 5; x++) a[x + y] = row[x] ^ (~row[(x + 1) % 5] & MASK & row[(x + 2) % 5]);
    }
    a[0] ^= RC[round];
  }
}

/** Keccak-256 of bytes, or of a string's UTF-8 bytes (as `cast keccak` hashes a non-0x string). */
export function keccak256(input: Uint8Array | string): Hex {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const blocks = Math.floor(data.length / RATE) + 1;
  const padded = new Uint8Array(blocks * RATE);
  padded.set(data);
  padded[data.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;

  const state = new Array<bigint>(25).fill(0n);
  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE / 8; i++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(padded[off + 8 * i + b]);
      state[i] ^= lane;
    }
    permute(state);
  }

  let hex = '';
  for (let i = 0; i < 4; i++) {
    for (let b = 0; b < 8; b++) hex += Number((state[i] >> BigInt(8 * b)) & 0xffn).toString(16).padStart(2, '0');
  }
  return `0x${hex}`;
}

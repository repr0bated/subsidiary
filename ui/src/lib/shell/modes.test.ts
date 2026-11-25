import { describe, expect, it } from 'vitest';
import { modesFor } from './modes';
import { gridColumns } from './layout';

describe('mode picker', () => {
  it('offers no Personal mode to a subsidiary', () => {
    expect(modesFor(true)).not.toContain('personal');
    expect(modesFor(false)).toContain('personal');
  });
});

describe('shell layout', () => {
  it('gives a collapsed panel its space to the canvas', () => {
    expect(gridColumns({ chat: false, picker: true, nav: false })).toBe('0 1fr 0');
    expect(gridColumns({ chat: true, picker: true, nav: true })).toBe('14rem 1fr 26rem');
  });
});

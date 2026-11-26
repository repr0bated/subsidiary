import { describe, expect, it } from 'vitest';
import { builtInSkeleton, skeletonFrom, splitSpec } from './skeleton';

describe('page skeleton', () => {
  it('reads the Shell surface purpose', () => {
    const surfaces = [{ name: 'Chat', purpose: 'vite' }, { name: 'Shell', purpose: JSON.stringify(builtInSkeleton) }];
    expect(skeletonFrom(surfaces)).toEqual(builtInSkeleton);
  });
  it('returns null without a Shell surface or with a bad purpose', () => {
    expect(skeletonFrom([{ name: 'Chat', purpose: 'vite' }])).toBeNull();
    expect(skeletonFrom([{ name: 'Shell', purpose: 'not json' }])).toBeNull();
  });
  it('moves the nav element out of the canvas', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, children: ['hello', 'nav'] },
        hello: { type: 'Text', props: { text: 'Hi' } },
        nav: { type: 'ButtonGroup', props: {}, children: [] }
      }
    };
    const { canvas, slots } = splitSpec(spec as never, ['nav']);
    expect((slots.nav as unknown as { root: string }).root).toBe('nav');
    expect((canvas as unknown as typeof spec).elements.page.children).toEqual(['hello']);
  });
  it('leaves a spec without slot elements on the canvas', () => {
    const spec = { root: 'a', elements: { a: { type: 'Text', props: { text: 'x' } } } };
    expect(splitSpec(spec as never, ['nav'])).toEqual({ canvas: spec, slots: {} });
  });
});

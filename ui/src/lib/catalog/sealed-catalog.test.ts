import { describe, expect, it } from 'vitest';
import { catalogFromSealed } from './sealed-catalog';
import { BURSTS } from '../comic/bursts';

// Minimal fixture in the shape json_render.list_components returns (not a copy of the catalog).
const fixture = [
  { name: 'Text', props_schema: { type: 'object', properties: { text: { type: 'string' }, variant: { type: ['string', 'null'] } }, required: ['text'] }, slots: [], description: 'Text' },
  { name: 'Card', props_schema: { type: 'object', properties: { title: { type: ['string', 'null'] } } }, slots: ['default'] }
];

describe('catalogFromSealed', () => {
  it('builds a catalog whose props validate against the sealed JSON Schema', () => {
    const catalog = catalogFromSealed(fixture) as unknown as { data: { components: Record<string, { props: { safeParse: (v: unknown) => { success: boolean } } }> } };
    const text = catalog.data.components.Text.props;
    expect(text.safeParse({ text: 'hi', variant: null }).success).toBe(true);
    expect(text.safeParse({ variant: 'lead' }).success).toBe(false);
  });

  it('skips entries without a name', () => {
    const catalog = catalogFromSealed([{ props_schema: {} } as never, ...fixture]) as unknown as { data: { components: Record<string, unknown> } };
    expect(Object.keys(catalog.data.components).sort()).toEqual(['Card', 'Text']);
  });
});

describe('bursts', () => {
  it('give every burst a text equivalent for screen readers', () => {
    for (const b of Object.values(BURSTS)) expect(b.label.length).toBeGreaterThan(3);
  });
});

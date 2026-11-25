import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/svelte';
import { z } from 'zod';

/**
 * The json-render catalog is built at runtime from the components sealed in the `json_render`
 * blob (`json_render.list_components`): one source, no copy in this repository. Each sealed
 * component's `props_schema` (JSON Schema) becomes its zod schema.
 */
export interface SealedComponent {
  name: string;
  category?: string;
  props_schema: unknown;
  slots?: string[];
  events?: string[];
  description?: string;
}

export function catalogFromSealed(components: SealedComponent[]) {
  const entries: Record<string, { props: z.ZodType; slots: string[]; description: string }> = {};
  for (const c of components) {
    if (!c?.name || typeof c.name !== 'string') continue;
    entries[c.name] = {
      props: z.fromJSONSchema(c.props_schema as Parameters<typeof z.fromJSONSchema>[0]),
      slots: Array.isArray(c.slots) ? c.slots : [],
      description: typeof c.description === 'string' ? c.description : ''
    };
  }
  return defineCatalog(schema, { components: entries } as never);
}

/** The page skeleton: the default layout, read from the `purpose` of chat_router's sealed "Shell"
 * ui_surface. The built-in copy below is used only until the resealed plugin delivers it; it
 * matches odbus-verified e5d00f2. Changes the user makes stay in memory and are never stored. */
import type { Spec } from '@json-render/svelte';

export type Slot =
  | { id: string; kind: 'canvas'; render: 'chatbot' }
  | { id: string; kind: 'drawer'; edge: 'top' | 'bottom'; open: boolean; height: number; holds: 'model_mode' | 'chat' }
  | { id: string; kind: 'row'; edge: 'bottom'; below?: string; render: 'chatbot' };

export interface Skeleton {
  skeleton: 1;
  slots: Slot[];
}

export const builtInSkeleton: Skeleton = {
  skeleton: 1,
  slots: [
    { id: 'canvas', kind: 'canvas', render: 'chatbot' },
    { id: 'picker', kind: 'drawer', edge: 'top', open: false, height: 0.3, holds: 'model_mode' },
    { id: 'chat', kind: 'drawer', edge: 'bottom', open: false, height: 0.4, holds: 'chat' },
    { id: 'nav', kind: 'row', edge: 'bottom', below: 'chat', render: 'chatbot' }
  ]
};

/** The Shell skeleton from a ListUiSurfaces result, or null if it isn't there or isn't one. */
export function skeletonFrom(surfaces: unknown): Skeleton | null {
  if (!Array.isArray(surfaces)) return null;
  const shell = surfaces.find((s) => s && typeof s === 'object' && (s as { name?: unknown }).name === 'Shell') as
    | { purpose?: unknown }
    | undefined;
  if (typeof shell?.purpose !== 'string') return null;
  try {
    const parsed = JSON.parse(shell.purpose) as Skeleton;
    return parsed?.skeleton === 1 && Array.isArray(parsed.slots) ? parsed : null;
  } catch {
    return null;
  }
}

type FlatSpec = { root: string; elements: Record<string, { children?: string[] } & Record<string, unknown>> };

/** Split one chatbot spec across slots: an element keyed by a chatbot-rendered slot id (other
 * than the canvas) is that slot's view; everything else stays on the canvas. */
export function splitSpec(spec: Spec | null, slotIds: string[]): { canvas: Spec | null; slots: Record<string, Spec> } {
  const flat = spec as unknown as FlatSpec | null;
  if (!flat?.elements || typeof flat.root !== 'string') return { canvas: spec, slots: {} };
  const taken = slotIds.filter((id) => id in flat.elements && id !== flat.root);
  if (!taken.length) return { canvas: spec, slots: {} };
  const slots = Object.fromEntries(taken.map((id) => [id, { ...flat, root: id } as unknown as Spec]));
  const elements = Object.fromEntries(
    Object.entries(flat.elements).map(([k, el]) => [
      k,
      Array.isArray(el.children) ? { ...el, children: el.children.filter((c) => !taken.includes(c)) } : el
    ])
  );
  return { canvas: { ...flat, elements } as unknown as Spec, slots };
}

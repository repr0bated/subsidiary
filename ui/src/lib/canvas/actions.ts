import { isFeedPath } from './registry/feed-path';

/**
 * Handlers only for actions the sealed json_render catalog declares (json_render.list_actions):
 * today setState, pushState, removeState and validateForm, all local view state. A rendered view
 * cannot call a backend method until the catalog seals an action for it (owner item).
 * No handler may write into the read-only feed branch /plugins (requirement 6b.5).
 */
export interface SealedAction {
  name: string;
  params?: string[];
  mutates_state?: boolean;
}

type SetState = (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
type Handler = (params: Record<string, unknown>, setState: SetState, state: Record<string, unknown>) => Promise<void> | void;

function pathOf(params: Record<string, unknown>): string {
  const p = params.statePath;
  if (typeof p !== 'string' || !p.startsWith('/')) throw new Error('statePath must be a JSON Pointer');
  if (isFeedPath(p)) throw new Error('feed data under /plugins is read-only');
  return p;
}

function setAt(obj: Record<string, unknown>, pointer: string, fn: (prev: unknown) => unknown): Record<string, unknown> {
  const keys = pointer.split('/').slice(1).map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
  const root: Record<string, unknown> = { ...obj };
  let cur: Record<string, unknown> = root;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = fn(cur[k]);
    else {
      const next = cur[k] && typeof cur[k] === 'object' ? { ...(cur[k] as Record<string, unknown>) } : {};
      cur[k] = next;
      cur = next;
    }
  });
  return root;
}

const BUILTIN: Record<string, Handler> = {
  setState: (p, set) => {
    const path = pathOf(p);
    set((s) => setAt(s, path, () => p.value));
  },
  pushState: (p, set) => {
    const path = pathOf(p);
    set((s) => {
      let next = setAt(s, path, (prev) => [...(Array.isArray(prev) ? prev : []), p.value]);
      if (typeof p.clearStatePath === 'string' && p.clearStatePath.startsWith('/') && !isFeedPath(p.clearStatePath)) next = setAt(next, p.clearStatePath, () => '');
      return next;
    });
  },
  removeState: (p, set) => {
    const path = pathOf(p);
    const i = Number(p.index);
    set((s) => setAt(s, path, (prev) => (Array.isArray(prev) ? prev.filter((_, j) => j !== i) : prev)));
  },
  validateForm: (p) => {
    pathOf(p); // validation itself is run by json-render's ValidationProvider
  }
};

/** Handlers for exactly the sealed actions that have a known implementation. */
export function handlersFor(sealed: SealedAction[]): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const a of sealed) if (a?.name && BUILTIN[a.name]) out[a.name] = BUILTIN[a.name];
  return out;
}

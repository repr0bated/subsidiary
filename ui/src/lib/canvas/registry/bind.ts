import { getBoundProp } from '@json-render/svelte';
import { isFeedPath } from './feed-path';

/**
 * Two-way binding for inputs, limited to local view state. Feed data under /plugins is
 * read-only (requirement 6b.5): a binding into it reads but never writes.
 */
export function localBind<T>(value: () => T | undefined, path: () => string | undefined) {
  const bound = getBoundProp(value, path);
  return {
    get current(): T | undefined {
      return bound.current;
    },
    set current(v: T | undefined) {
      const p = path();
      if (isFeedPath(p)) return;
      bound.current = v;
    }
  };
}

import type { CatalogOperation } from '../door/types';

/**
 * The chatbot is the UI: nothing from the catalog reaches the human until the chatbot renders it,
 * and the chatbot never renders capabilities (requirements 2.1 to 2.4).
 */

/** Runnable exactly when the backend flags it `currently_granted`. */
export function isRunnable(op: CatalogOperation): boolean {
  return op.currently_granted === true;
}

/** Keys that carry capability or grant information. Never rendered. */
const CAPABILITY_KEY = /^(required_capability|capability|capabilities|capability_id|held_capabilities|grants?|grant_id|currently_granted)$/i;

/**
 * Remove every capability or grant field, at any depth, from a value before it is rendered.
 * Arrays and objects are copied; the input is not changed.
 */
export function stripCapabilities<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripCapabilities(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CAPABILITY_KEY.test(k)) continue;
      out[k] = stripCapabilities(v);
    }
    return out as T;
  }
  return value;
}

/** What the chatbot may render for an operation: its name, whether it can run, no capabilities. */
export interface RenderedOperation {
  method: string;
  runnable: boolean;
  [key: string]: unknown;
}

export function renderOperation(op: CatalogOperation): RenderedOperation {
  const { method, call_path: _c, metadata_path: _m, ...rest } = op;
  return { ...stripCapabilities(rest), method, runnable: isRunnable(op) };
}

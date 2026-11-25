import type { Door, Receipt } from './types';

/**
 * Every action the UI takes is exactly one CallMethod as the human. The receipt comes back
 * unchanged, including `outcome_unknown` and refusals. Nothing here retries: a retry is a new,
 * explicit user action (design property 1).
 */
export function makeCaller(door: Door) {
  return function call(plugin: string, method: string, args: unknown = {}): Promise<Receipt> {
    return door.callMethod(plugin, method, args);
  };
}

/** True when the backend could not establish the outcome; the UI shows it and never retries. */
export function isOutcomeUnknown(receipt: Receipt): boolean {
  return receipt.outcome === 'outcome_unknown';
}

/** True when the host refused the call. */
export function isRefused(receipt: Receipt): boolean {
  const o = typeof receipt.outcome === 'string' ? receipt.outcome : '';
  return receipt.success === false && o !== 'outcome_unknown' && /refus|denied|forbidden/i.test(o || 'refused');
}

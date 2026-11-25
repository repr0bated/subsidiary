import type { IdentitySource } from './client';

/**
 * The container is the identity. The container that serves this page writes its own SID1 into
 * the page as `window.__3TCHED_CONFIG__.identity` (owner decision 2026-11-25, same shape as
 * 3tched.com `src/chat/door-config.ts` `injectedIdentity`). The UI only reads it: it never mints,
 * stores, fetches or renders an identity, and it accepts no other kind (no OIA1, no decoy pickup).
 */
export const SID1_HEADER = 'x-opdbus-sealed-id-bin';

export interface InjectedConfig {
  identity?: { kind?: unknown; sealedId?: unknown };
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** The injected SID1, or undefined when the page carries none or it is malformed. */
export function injectedSealedId(config: InjectedConfig | undefined): string | undefined {
  const id = config?.identity;
  if (!id || id.kind !== 'sid1' || typeof id.sealedId !== 'string') return undefined;
  const value = id.sealedId.trim();
  if (!value || value.length % 4 !== 0 || !BASE64.test(value)) return undefined;
  return value;
}

function pageConfig(): InjectedConfig | undefined {
  return (globalThis as { __3TCHED_CONFIG__?: InjectedConfig }).__3TCHED_CONFIG__;
}

/**
 * The page's identity source, or undefined when the container injected none (the shell then
 * shows "not connected"). The value lives in memory for the life of the page only.
 */
export function containerIdentity(config: InjectedConfig | undefined = pageConfig()): IdentitySource | undefined {
  const sealedId = injectedSealedId(config);
  if (!sealedId) return undefined;
  const meta = Object.freeze({ [SID1_HEADER]: sealedId });
  return { metadata: async () => ({ ...meta }) };
}

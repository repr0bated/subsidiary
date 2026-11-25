/** True for the read-only feed branch of the state store. */
export function isFeedPath(p: string | undefined): boolean {
  return !!p && (p === '/plugins' || p.startsWith('/plugins/'));
}

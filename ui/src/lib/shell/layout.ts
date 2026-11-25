/** Shell layout. The sealed default comes from the blob schema; until the layout method is known,
 * changes stay in memory only (design open item 3) and are never written to browser storage. */
export interface ShellLayout {
  chat: boolean;
  picker: boolean;
  nav: boolean;
}

export const fallbackLayout: ShellLayout = { chat: true, picker: true, nav: true };

/** Columns for the CSS grid: a collapsed panel gives its space to the canvas. */
export function gridColumns(l: ShellLayout): string {
  return [l.nav ? '14rem' : '0', '1fr', l.chat ? '26rem' : '0'].join(' ');
}

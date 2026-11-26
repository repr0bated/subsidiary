/** Shell layout. The sealed default comes from the blob schema; until the layout method is known,
 * changes stay in memory only (design open item 3) and are never written to browser storage. */
export interface ShellLayout {
  chat: boolean;
  picker: boolean;
  nav: boolean;
}

export const fallbackLayout: ShellLayout = { chat: true, picker: true, nav: true };

/** Columns for the CSS grid: a collapsed panel gives its space to the canvas. */
export function gridColumns(l: ShellLayout, chatWidth?: number): string {
  const chat = chatWidth === undefined ? '26rem' : `${Math.round(chatWidth)}px`;
  return [l.nav ? '14rem' : '0', '1fr', l.chat ? chat : '0'].join(' ');
}
/** Keep the chat between 280px and 80% of the window. */
export function clampChatWidth(width: number, windowWidth: number): number {
  return Math.min(Math.max(width, 280), Math.max(280, windowWidth * 0.8));
}

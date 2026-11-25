/** Chat modes the backend defines (chat_mode_policy.rs). A subsidiary has no Personal mode. */
export const ALL_MODES = ['personal', 'project', 'control_plane', 'accountability', 'notebook_lm', 'ui_render'] as const;
export type ChatMode = (typeof ALL_MODES)[number];

export function modesFor(subsidiary: boolean): ChatMode[] {
  return ALL_MODES.filter((m) => !(subsidiary && m === 'personal'));
}

const LABELS: Record<ChatMode, string> = {
  personal: 'Personal',
  project: 'Project',
  control_plane: 'Control plane',
  accountability: 'Accountability',
  notebook_lm: 'Notebook',
  ui_render: 'Render a view'
};
export const modeLabel = (m: ChatMode) => LABELS[m];

<script lang="ts" module>
  export type DockSize = 'min' | 'normal' | 'max';
</script>
<script lang="ts">
  // The chat floats over the canvas in the bottom-right corner, so the canvas stays visible behind
  // it. Three sizes: minimized (only the pull tab shows), normal (a corner window) and maximized
  // (most of the window, for long answers). The size stays in memory only.
  import type { Snippet } from 'svelte';
  let {
    size = $bindable<DockSize>('min'),
    title = 'Chat',
    bottom = '0px',
    top = '0px',
    children
  }: { size?: DockSize; title?: string; bottom?: string; top?: string; children: Snippet } = $props();
  const bodyId = $props.id();
  let restore: DockSize = 'normal';
  function toggle() {
    if (size === 'min') size = restore;
    else {
      restore = size;
      size = 'min';
    }
  }
  function maximize() {
    size = size === 'max' ? 'normal' : 'max';
  }
  function minimize() {
    restore = size === 'min' ? restore : size;
    size = 'min';
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && size !== 'min') {
      e.preventDefault();
      minimize();
    }
  }
</script>
<aside class="dock" data-size={size} style:--dock-bottom={bottom} style:--dock-top={top} aria-label={title} {onkeydown}>
  <button type="button" class="tab display" aria-expanded={size !== 'min'} aria-controls={bodyId} onclick={toggle}>
    {size === 'min' ? `${title} ▲` : `Close ${title} ▼`}
  </button>
  <div class="window" id={bodyId} hidden={size === 'min'}>
    <header class="bar display">
      <strong>{title}</strong>
      <span class="controls">
        <button type="button" onclick={minimize} aria-label="Minimize chat" title="Minimize">–</button>
        <button type="button" onclick={maximize} aria-label={size === 'max' ? 'Restore chat size' : 'Maximize chat'} title={size === 'max' ? 'Restore' : 'Maximize'}>
          {size === 'max' ? '❐' : '□'}
        </button>
      </span>
    </header>
    <div class="body">{@render children()}</div>
  </div>
</aside>
<style>
  .dock {
    position: fixed;
    z-index: 6;
    right: 1rem;
    bottom: calc(var(--dock-bottom) + 0.5rem);
    width: min(28rem, calc(100vw - 2rem));
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    pointer-events: none;
  }
  .dock > * { pointer-events: auto; }
  .dock[data-size='max'] {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: min(72rem, calc(100vw - 2rem));
    top: calc(var(--dock-top) + 0.75rem);
  }
  .tab {
    border: 3px solid var(--ink);
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    background: var(--pop-yellow);
    color: var(--ink);
    padding: 0.35rem 1rem;
    font-size: 1rem;
    box-shadow: 4px 0 0 var(--ink);
    cursor: pointer;
  }
  .dock[data-size='min'] .tab { border-bottom: 3px solid var(--ink); border-radius: 14px; box-shadow: 4px 4px 0 var(--ink); }
  .window {
    width: 100%;
    height: min(26rem, calc(100vh - var(--dock-top) - var(--dock-bottom) - 4rem));
    display: flex;
    flex-direction: column;
    border: var(--outline);
    box-shadow: 7px 7px 0 var(--ink);
    background-color: var(--paper);
    background-image: radial-gradient(rgba(255, 0, 127, 0.18) 1.5px, transparent 1.5px);
    background-size: 12px 12px;
    animation: rise 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .window[hidden] { display: none; }
  .dock[data-size='max'] .window { height: auto; flex: 1; min-height: 0; }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    background: var(--pop-red);
    color: var(--paper);
    padding: 0.4rem 0.6rem 0.4rem 0.85rem;
    border-bottom: 3px solid var(--ink);
    text-shadow: 2px 2px 0 var(--ink);
  }
  .controls { display: flex; gap: 0.35rem; }
  .controls button {
    min-width: 1.8rem;
    border: 2px solid var(--ink);
    background: var(--pop-yellow);
    color: var(--ink);
    font-weight: 900;
    line-height: 1.2;
    cursor: pointer;
    text-shadow: none;
  }
  .body { flex: 1; min-height: 0; }
  @keyframes rise { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
</style>

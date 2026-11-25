<script lang="ts">
  // A drawer on the top or bottom edge of the window. Pull its handle to open it, drag to size it,
  // click to open or close. It stays the size the user leaves it.
  import type { Snippet } from 'svelte';
  let {
    edge,
    label,
    closedLabel,
    open = $bindable(false),
    height = $bindable(0.4),
    children
  }: {
    edge: 'top' | 'bottom';
    label: string;
    closedLabel: string;
    open?: boolean;
    height?: number;
    children: Snippet;
  } = $props();
  const MIN = 0.15;
  const MAX = 0.85;
  const bodyId = $props.id();
  const clamp = (h: number) => Math.min(MAX, Math.max(MIN, h));
  /** Distance from this drawer's edge to the pointer, as a fraction of the window. */
  const fromEdge = (y: number) => (edge === 'bottom' ? window.innerHeight - y : y) / window.innerHeight;
  /** Arrow key that grows the drawer: up for the bottom edge, down for the top edge. */
  const grow = $derived(edge === 'bottom' ? 'ArrowUp' : 'ArrowDown');
  const shrink = $derived(edge === 'bottom' ? 'ArrowDown' : 'ArrowUp');
  let drag: { startY: number; moved: boolean } | null = null;
  function onpointerdown(e: PointerEvent) {
    drag = { startY: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onpointermove(e: PointerEvent) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientY - drag.startY) < 6) return;
    drag.moved = true;
    const h = fromEdge(e.clientY);
    if (h < MIN / 2) {
      open = false;
    } else {
      open = true;
      height = clamp(h);
    }
  }
  function onpointerup() {
    if (drag && !drag.moved) open = !open;
    drag = null;
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === grow) {
      e.preventDefault();
      if (!open) open = true;
      else height = clamp(height + 0.1);
    } else if (e.key === shrink) {
      e.preventDefault();
      if (height - 0.1 < MIN) open = false;
      else height = clamp(height - 0.1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open = !open;
    }
  }
</script>
{#snippet handle()}
  <button
    type="button"
    class="handle display"
    aria-expanded={open}
    aria-controls={bodyId}
    title="Drag to resize, click to open or close, arrow keys to resize"
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    onpointercancel={() => (drag = null)}
    {onkeydown}
  >
    <span class="grip" aria-hidden="true"></span>
    <span>{open ? label : closedLabel}</span>
  </button>
{/snippet}
<section class="drawer {edge}" class:open style:height={open ? `${height * 100}vh` : null} aria-label={label}>
  {#if edge === 'bottom'}{@render handle()}{/if}
  <div id={bodyId} class="body" hidden={!open}>
    <div class="measure">{@render children()}</div>
  </div>
  {#if edge === 'top'}{@render handle()}{/if}
</section>
<style>
  .drawer {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: var(--paper);
  }
  .bottom {
    bottom: 0;
    border-top: var(--outline);
    box-shadow: 0 -6px 0 var(--ink);
  }
  .top {
    top: 0;
    border-bottom: var(--outline);
    box-shadow: 0 6px 0 var(--ink);
  }
  .handle {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    width: 100%;
    border: 0;
    background: var(--pop-yellow);
    padding: 0.35rem 0.8rem 0.45rem;
    font-size: 1.1rem;
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
  }
  .bottom.open .handle {
    border-bottom: var(--outline);
  }
  .top.open .handle {
    border-top: var(--outline);
  }
  .handle:focus-visible {
    outline: 3px solid var(--pop-red);
    outline-offset: -5px;
  }
  .grip {
    width: 3.5rem;
    height: 0.35rem;
    border-radius: 1rem;
    background: var(--ink);
  }
  .body {
    flex: 1;
    overflow: auto;
  }
  /* A readable line length, however wide the window. */
  .measure {
    max-width: 68ch;
    margin: 0 auto;
    padding: 0 1rem;
    overflow-wrap: anywhere;
  }
</style>

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
    offset = '0px',
    children
  }: {
    edge: 'top' | 'bottom';
    label: string;
    closedLabel: string;
    open?: boolean;
    height?: number;
    /** CSS length between the drawer and its edge, e.g. a row below the chat. */
    offset?: string;
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
<section class="drawer {edge}" class:open style:--offset={offset} style:height={open ? `${height * 100}vh` : null} aria-label={label}>
  {#if edge === 'bottom'}{@render handle()}{/if}
  <div id={bodyId} class="body" hidden={!open}>
    <div class="measure">{@render children()}</div>
  </div>
  {#if edge === 'top'}{@render handle()}{/if}
</section>
<style>
  /* Pop-art drawer: the body is an outlined panel, the handle a pull tab hanging off it.
     Closed, only the tab shows, so the canvas behind stays usable. */
  .drawer {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    pointer-events: none;
  }
  .drawer > * {
    pointer-events: auto;
  }
  .bottom {
    bottom: var(--offset);
  }
  .top {
    top: var(--offset);
  }
  .body {
    flex: 1;
    overflow: auto;
    background: var(--paper);
  }
  .bottom .body {
    border-top: var(--outline);
    box-shadow: 0 -7px 0 var(--ink);
    background-image: radial-gradient(color-mix(in srgb, var(--pop-red) 22%, transparent) 1.75px, transparent 1.75px);
    background-size: 12px 12px;
  }
  .top .body {
    border-bottom: var(--outline);
    box-shadow: 0 7px 0 var(--ink);
    background-color: var(--pop-yellow);
    background-image: radial-gradient(color-mix(in srgb, var(--pop-red) 35%, transparent) 2px, transparent 2px);
    background-size: 10px 10px;
  }
  .handle {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    align-self: center;
    border: 3px solid var(--ink);
    background: var(--pop-yellow);
    color: var(--ink);
    padding: 0.3rem 1.1rem;
    font-size: 1.05rem;
    letter-spacing: 0.06em;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
    transition: transform 0.12s ease;
  }
  .handle:hover {
    transform: translateY(var(--nudge));
  }
  /* The chat tab sits at the right, like a speech balloon's tail; the picker tab hangs centered. */
  .bottom .handle {
    --nudge: -2px;
    align-self: flex-end;
    margin-right: 1rem;
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    box-shadow: 4px 0 0 var(--ink);
  }
  .bottom.open .handle {
    background: var(--pop-red);
    color: var(--paper);
    text-shadow: 2px 2px 0 var(--ink);
  }
  .top .handle {
    --nudge: 2px;
    border-top: none;
    border-radius: 0 0 12px 12px;
  }
  .handle:focus-visible {
    outline: 3px dashed var(--pop-red);
    outline-offset: 3px;
  }
  .grip {
    width: 1.6rem;
    height: 0.3rem;
    border-radius: 1rem;
    background: currentColor;
  }
  /* A readable line length, however wide the window. */
  .measure {
    max-width: 68ch;
    margin: 0 auto;
    padding: 0 1rem;
    overflow-wrap: anywhere;
  }
</style>

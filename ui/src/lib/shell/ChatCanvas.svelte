<script lang="ts">
  // The simplest shell: the canvas fills the browser window (polka dots mark its extent) and the
  // chatbot is a drawer along the bottom. Pull its handle up to open it, drag to size it, click to
  // open or close. The conversation is held to a readable line length.
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';

  let { session = null, conversationId = '' }: { session?: Session | null; conversationId?: string } = $props();
  let spec = $state<Spec | null>(null);
  let open = $state(false);
  /** Drawer height as a fraction of the window while open. */
  let height = $state(0.4);
  const MIN = 0.15;
  const MAX = 0.85;
  const bodyId = $props.id();

  const clamp = (h: number) => Math.min(MAX, Math.max(MIN, h));

  let drag: { startY: number; moved: boolean } | null = null;

  function onpointerdown(e: PointerEvent) {
    drag = { startY: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onpointermove(e: PointerEvent) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientY - drag.startY) < 6) return;
    drag.moved = true;
    const h = (window.innerHeight - e.clientY) / window.innerHeight;
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
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) open = true;
      else height = clamp(height + 0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (height - 0.1 < MIN) open = false;
      else height = clamp(height - 0.1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open = !open;
    }
  }
</script>

<div class="window">
  <main class="canvas" aria-label="Canvas">
    <Canvas {spec} components={session?.components ?? []} />
  </main>

  <section class="drawer" class:open style:height={open ? `${height * 100}vh` : null} aria-label="Chatbot">
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
      <span>{open ? 'Chat' : 'Pull up to chat'}</span>
    </button>
    <div id={bodyId} class="body" hidden={!open}>
      <div class="measure">
        {#if session && conversationId}
          <ChatPanel {session} {conversationId} onview={(s) => (spec = s)} />
        {:else}
          <p class="placeholder">Not connected yet.</p>
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .window {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  .canvas {
    position: absolute;
    inset: 0;
    overflow: auto;
    background-color: var(--paper);
    background-image: radial-gradient(var(--pop-blue) 22%, transparent 24%);
    background-size: 32px 32px;
  }
  .drawer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border-top: var(--outline);
    background: var(--paper);
    box-shadow: 0 -6px 0 var(--ink);
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
  .drawer.open .handle {
    border-bottom: var(--outline);
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
  .placeholder {
    margin: 1rem 0;
    font-weight: 700;
  }
</style>

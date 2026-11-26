<script lang="ts">
  import { untrack } from 'svelte';
  import { clampChatWidth, fallbackLayout, gridColumns, type ShellLayout } from './layout';
  import NavMenu from './NavMenu.svelte';
  import ModelModePicker from './ModelModePicker.svelte';
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import AccountabilityView from '../accountability/AccountabilityView.svelte';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';

  let { initial = fallbackLayout, session = null, conversationId = '' }: { initial?: ShellLayout; session?: Session | null; conversationId?: string } = $props();
  let spec = $state<Spec | null>(null);
  let tab = $state<'canvas' | 'stand'>('canvas');
  let incoming = $state<{ id: number; text: string } | null>(null);
  // The default is read once; later changes are the user's (requirement 3.5).
  let layout = $state<ShellLayout>(untrack(() => ({ ...initial })));
  // Chat width stays where the user releases the handle (in memory only, like the rest of the layout).
  let chatWidth = $state<number | undefined>(undefined);
  let dragging = $state(false);
  let shellEl: HTMLDivElement;
  const columns = $derived(gridColumns(layout, chatWidth));
  function currentChatWidth(): number {
    return chatWidth ?? shellEl.querySelector('.chat')!.getBoundingClientRect().width;
  }
  function startDrag(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true;
  }
  function drag(e: PointerEvent) {
    if (!dragging) return;
    chatWidth = clampChatWidth(window.innerWidth - e.clientX, window.innerWidth);
  }
  function endDrag() {
    dragging = false;
  }
  function nudge(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.key === 'ArrowLeft' ? 24 : -24;
    chatWidth = clampChatWidth(currentChatWidth() + step, window.innerWidth);
  }

  function toggle(panel: keyof ShellLayout) {
    layout[panel] = !layout[panel];
  }
</script>

<div class="shell" class:dragging bind:this={shellEl} style:grid-template-columns={columns}>
  <aside class="nav" class:collapsed={!layout.nav} aria-label="Navigation">
    {#if layout.nav}<NavMenu />{/if}
  </aside>

  <main class="canvas" aria-label="Canvas">
    <div class="toolbar">
      <span class="brand display">Subsidiary</span>
      <button type="button" onclick={() => toggle('nav')} aria-pressed={layout.nav}>Menu</button>
      <button type="button" onclick={() => toggle('picker')} aria-pressed={layout.picker}>Model and mode</button>
      <button type="button" onclick={() => toggle('chat')} aria-pressed={layout.chat}>Chat</button>
      <button type="button" onclick={() => (tab = 'canvas')} aria-pressed={tab === 'canvas'}>Canvas</button>
      <button type="button" onclick={() => (tab = 'stand')} aria-pressed={tab === 'stand'}>On the stand</button>
    </div>
    {#if tab === 'stand' && session}
      <AccountabilityView call={(p, m, a) => session.call(p, m, a)} onask={(q) => { layout.chat = true; incoming = { id: (incoming?.id ?? 0) + 1, text: q }; }} />
    {:else}
      <Canvas {spec} components={session?.components ?? []} />
    {/if}
  </main>

  <section class="chat" class:collapsed={!layout.chat} aria-label="Chat">
    {#if layout.chat}
      <!-- A focusable separator is the WAI-ARIA window splitter pattern. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div
        class="resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        tabindex="0"
        onpointerdown={startDrag}
        onpointermove={drag}
        onpointerup={endDrag}
        onpointercancel={endDrag}
        onkeydown={nudge}
      ></div>
    {/if}
    {#if layout.picker}<ModelModePicker />{/if}
    {#if layout.chat}
      {#if session && conversationId}
        <ChatPanel {session} {conversationId} {incoming} onview={(s) => (spec = s)} />
      {:else}
        <p class="placeholder">Not connected yet.</p>
      {/if}
    {/if}
  </section>
</div>

<style>
  .shell {
    display: grid;
    height: 100vh;
    transition: grid-template-columns 150ms ease;
  }
  .collapsed {
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem;
    border-bottom: var(--outline);
    background: var(--pop-yellow);
  }
  .toolbar button {
    border: 3px solid var(--ink);
    background: var(--paper);
    font-family: var(--font-display);
    letter-spacing: 0.04em;
    padding: 0.25rem 0.7rem;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .toolbar button[aria-pressed='true'] {
    background: var(--pop-red);
    color: var(--paper);
  }
  .brand {
    font-size: 1.6rem;
    margin-right: 0.6rem;
    color: var(--pop-red);
    -webkit-text-stroke: 0.6px var(--ink);
    text-shadow: 2px 2px 0 var(--ink);
  }
  .canvas {
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
  }
  .placeholder {
    margin: 1rem;
    padding: 0.6rem 0.8rem;
    border: var(--outline);
    background: var(--paper);
    font-weight: 700;
  }
  .chat {
    position: relative;
    overflow: auto;
    background: var(--paper);
  }
  .resizer {
    position: sticky;
    top: 0;
    float: left;
    width: 8px;
    height: 100vh;
    margin-right: -8px;
    z-index: 5;
    cursor: col-resize;
    touch-action: none;
    background: transparent;
  }
  .resizer:hover,
  .resizer:focus-visible,
  .dragging .resizer {
    background: var(--pop-red);
  }
  .dragging {
    transition: none;
    user-select: none;
  }
  .chat,
  .nav {
    border: 3px solid #000;
  }
  @media (prefers-reduced-motion: reduce) {
    .shell {
      transition: none;
    }
  }
</style>

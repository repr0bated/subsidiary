<script lang="ts">
  import { untrack } from 'svelte';
  import { fallbackLayout, gridColumns, type ShellLayout } from './layout';
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
  const columns = $derived(gridColumns(layout));

  function toggle(panel: keyof ShellLayout) {
    layout[panel] = !layout[panel];
  }
</script>

<div class="shell" style:grid-template-columns={columns}>
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
    {#if layout.picker}<ModelModePicker />{/if}
    {#if layout.chat}
      {#if session && conversationId}
        <ChatPanel {session} {conversationId} {incoming} onview={(s) => (spec = s)} />
      {:else}
        <p class="placeholder">Not connected yet: the door needs this browser's identity (owner setup).</p>
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
    overflow: auto;
    background: var(--paper);
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

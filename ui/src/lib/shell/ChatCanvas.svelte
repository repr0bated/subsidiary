<script lang="ts">
  // The page, laid out by the skeleton in chat_router's sealed "Shell" ui_surface (built-in copy
  // until the reseal ships it). The canvas fills the window; the model and chat-mode picker is a
  // drawer along the top; the chatbot is a drawer along the bottom; the nav row sits below the
  // chat. The canvas and the nav row show only what the chatbot renders.
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import EdgeDrawer from './EdgeDrawer.svelte';
  import ModelModePicker from './ModelModePicker.svelte';
  import { builtInSkeleton, skeletonFrom, splitSpec, type Skeleton, type Slot } from './skeleton';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';

  let { session = null }: { session?: Session | null } = $props();
  let spec = $state<Spec | null>(null);
  let skeleton = $state<Skeleton>(builtInSkeleton);
  let navHeight = $state(0);

  $effect(() => {
    const s = session;
    if (!s) return;
    void s.listUiSurfaces().then(
      (surfaces) => {
        const sealed = skeletonFrom(surfaces);
        if (sealed) skeleton = sealed;
      },
      () => {}
    );
  });

  type Drawer = Extract<Slot, { kind: 'drawer' }>;
  type Row = Extract<Slot, { kind: 'row' }>;
  const drawer = (holds: Drawer['holds']) => skeleton.slots.find((s): s is Drawer => s.kind === 'drawer' && s.holds === holds);
  const picker = $derived(drawer('model_mode'));
  const chat = $derived(drawer('chat'));
  const nav = $derived(skeleton.slots.find((s): s is Row => s.kind === 'row'));
  const views = $derived(splitSpec(spec, nav ? [nav.id] : []));
  const navSpec = $derived(nav ? (views.slots[nav.id] ?? null) : null);
  const components = $derived(session?.components ?? []);
</script>

<div class="window" style:--nav-h="{navSpec ? navHeight : 0}px">
  <main class="canvas" aria-label="Canvas">
    <Canvas spec={views.canvas} {components} />
  </main>
  {#if picker}
    <EdgeDrawer edge="top" label="Model and mode" closedLabel="Pull down for model and mode" open={picker.open} height={picker.height}>
      <ModelModePicker {session} />
    </EdgeDrawer>
  {/if}
  {#if chat}
    <EdgeDrawer edge="bottom" label="Chat" closedLabel="Pull up to chat" open={chat.open} height={chat.height} offset="var(--nav-h)">
      {#if session}
        <ChatPanel {session} onview={(s) => (spec = s)} />
      {:else}
        <p class="placeholder">Not connected yet.</p>
      {/if}
    </EdgeDrawer>
  {/if}
  {#if nav && navSpec}
    <nav class="nav-row" aria-label="Navigation" bind:clientHeight={navHeight}>
      <Canvas spec={navSpec} {components} label="Navigation" compact />
    </nav>
  {/if}
</div>

<style>
  .window {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  .canvas {
    position: absolute;
    inset: 0 0 var(--nav-h) 0;
    overflow: auto;
    background-color: var(--paper);
    background-image: radial-gradient(var(--pop-red) 22%, transparent 24%);
    background-size: 32px 32px;
  }
  .nav-row {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    background: var(--ink);
    border-top: var(--outline);
    padding: 0.45rem 0.5rem;
    max-height: 30vh;
    overflow: auto;
  }
  /* Whatever the chatbot puts in the row reads as a strip of panels. */
  .nav-row :global(button) {
    border: 3px solid var(--ink);
    box-shadow: 0 3px 0 var(--paper);
  }
  .placeholder {
    margin: 1rem 0;
    font-weight: 700;
  }
</style>

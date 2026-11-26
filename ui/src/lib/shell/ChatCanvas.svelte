<script lang="ts">
  // The page, laid out by the skeleton in chat_router's sealed "Shell" ui_surface (built-in copy
  // until the reseal ships it). A pink top bar holds the model and chat-mode picker as a pull-down
  // drawer. The canvas is a centred column on a Ben-Day page and scrolls under everything. The
  // chatbot floats over the canvas in the bottom-right corner (minimize, normal, maximize), so the
  // canvas stays visible behind it. The nav row is pinned to the bottom. The canvas and the nav
  // row show only what the chatbot renders.
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import ChatDock, { type DockSize } from './ChatDock.svelte';
  import TopBar from './TopBar.svelte';
  import ModelModePicker from './ModelModePicker.svelte';
  import { builtInSkeleton, skeletonFrom, splitSpec, type Skeleton, type Slot } from './skeleton';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';
  let { session = null }: { session?: Session | null } = $props();
  let spec = $state<Spec | null>(null);
  let skeleton = $state<Skeleton>(builtInSkeleton);
  let navHeight = $state(0);
  let topHeight = $state(0);
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
  // The skeleton's open flags are the starting state; the user's changes stay in memory.
  let pickerOpen = $state(false);
  let chatSize = $state<DockSize>('min');
  let seeded = false;
  $effect(() => {
    if (seeded || !chat) return;
    seeded = true;
    pickerOpen = picker?.open ?? false;
    chatSize = chat.open ? 'normal' : 'min';
  });
</script>
{#snippet pickerView()}<ModelModePicker {session} />{/snippet}
<div class="page" style:--nav-h="{navSpec ? navHeight : 0}px">
  <div bind:clientHeight={topHeight}>
    <TopBar bind:open={pickerOpen} children={picker ? pickerView : undefined} />
  </div>
  <main class="canvas" aria-label="Canvas">
    <div class="column">
      <Canvas spec={views.canvas} {components} />
    </div>
  </main>
  {#if chat}
    <ChatDock bind:size={chatSize} title="Chat" bottom="{navSpec ? navHeight : 0}px" top="{topHeight}px">
      {#if session}
        <ChatPanel {session} onview={(s) => (spec = s)} />
      {:else}
        <p class="placeholder">Not connected yet.</p>
      {/if}
    </ChatDock>
  {/if}
  {#if nav && navSpec}
    <nav class="nav-row" aria-label="Navigation" bind:clientHeight={navHeight}>
      <Canvas spec={navSpec} {components} label="Navigation" compact />
    </nav>
  {/if}
</div>
<style>
  .page {
    min-height: 100vh;
    background: var(--paper);
  }
  .canvas {
    padding: 2rem 1.25rem calc(var(--nav-h) + 4rem);
  }
  /* The canvas column: a dotted border shows its extent; the chat floats over it. */
  .column {
    max-width: 72rem;
    margin: 0 auto;
    min-height: 60vh;
    padding: 1rem;
    background-image: radial-gradient(var(--pop-red) 1.75px, transparent 1.75px);
    background-size: 12px 12px;
  }
  .nav-row {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4;
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
    margin: 1rem;
    font-weight: 700;
  }
</style>

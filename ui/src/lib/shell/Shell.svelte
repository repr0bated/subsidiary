<script lang="ts">
  import { untrack } from 'svelte';
  import { fallbackLayout, gridColumns, type ShellLayout } from './layout';
  import NavMenu from './NavMenu.svelte';
  import ModelModePicker from './ModelModePicker.svelte';
  import Canvas from '../canvas/Canvas.svelte';

  let { initial = fallbackLayout }: { initial?: ShellLayout } = $props();
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
      <button type="button" onclick={() => toggle('nav')} aria-pressed={layout.nav}>Menu</button>
      <button type="button" onclick={() => toggle('picker')} aria-pressed={layout.picker}>Model and mode</button>
      <button type="button" onclick={() => toggle('chat')} aria-pressed={layout.chat}>Chat</button>
    </div>
    <Canvas />
  </main>

  <section class="chat" class:collapsed={!layout.chat} aria-label="Chat">
    {#if layout.picker}<ModelModePicker />{/if}
    {#if layout.chat}<p class="placeholder">Chat connects when the door is available.</p>{/if}
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
    gap: 0.5rem;
    padding: 0.5rem;
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

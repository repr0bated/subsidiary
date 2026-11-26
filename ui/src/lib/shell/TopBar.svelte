<script lang="ts">
  // The top bar, with the model and chat-mode picker as a pull-down drawer under it. The canvas
  // scrolls beneath both.
  import type { Snippet } from 'svelte';
  let {
    open = $bindable(false),
    title = 'Subsidiary',
    children
  }: { open?: boolean; title?: string; children?: Snippet } = $props();
  const drawerId = $props.id();
</script>
<header class="top">
  <div class="bar">
    <div class="brand"><span class="badge display">Pop!</span><h1 class="display">{title}</h1></div>
    {#if children}
      <button type="button" class="toggle display" aria-expanded={open} aria-controls={drawerId} onclick={() => (open = !open)}>
        Model and mode <span aria-hidden="true">{open ? '▲ Close' : '▼ Picker'}</span>
      </button>
    {/if}
  </div>
  {#if children}
    <div class="drawer" id={drawerId} hidden={!open}>{@render children()}</div>
    <button type="button" class="pull display" aria-expanded={open} aria-controls={drawerId} onclick={() => (open = !open)}>
      {open ? '▲ Hide picker' : '▼ Model and mode'}
    </button>
  {/if}
</header>
<style>
  .top { position: sticky; top: 0; z-index: 5; }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 1.25rem;
    background: var(--pop-red);
    color: var(--paper);
    border-bottom: var(--outline);
  }
  .brand { display: flex; align-items: center; gap: 0.75rem; }
  h1 { margin: 0; font-size: clamp(1.2rem, 2.5vw, 1.8rem); text-shadow: 3px 3px 0 var(--ink); }
  .badge { background: var(--pop-yellow); color: var(--ink); border: 3px solid var(--ink); padding: 0.1rem 0.5rem; transform: rotate(-4deg); }
  .toggle {
    display: flex;
    gap: 0.75rem;
    background: var(--pop-yellow);
    color: var(--ink);
    border: 3px solid var(--ink);
    box-shadow: 4px 4px 0 var(--ink);
    padding: 0.35rem 0.9rem;
    cursor: pointer;
  }
  .toggle:active, .pull:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--ink); }
  .drawer {
    background-color: var(--pop-yellow);
    background-image: radial-gradient(rgba(255, 0, 127, 0.35) 2px, transparent 2px);
    background-size: 10px 10px;
    border-bottom: var(--outline);
    max-height: 60vh;
    overflow: auto;
  }
  .drawer[hidden] { display: none; }
  .pull {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 100%;
    margin-top: -2px;
    background: var(--pop-yellow);
    color: var(--ink);
    border: 3px solid var(--ink);
    border-top: none;
    border-radius: 0 0 10px 10px;
    padding: 0.15rem 0.9rem;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
</style>

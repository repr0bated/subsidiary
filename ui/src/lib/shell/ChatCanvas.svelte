<script lang="ts">
  // The simplest shell: the canvas fills the browser window (polka dots mark its extent) and the
  // chatbot floats over it in a collapsible panel. Nothing else is loaded yet.
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';

  let { session = null, conversationId = '' }: { session?: Session | null; conversationId?: string } = $props();
  let spec = $state<Spec | null>(null);
  let open = $state(true);
  const bodyId = $props.id();
</script>

<div class="window">
  <main class="canvas" aria-label="Canvas">
    <Canvas {spec} components={session?.components ?? []} />
  </main>

  <section class="chatbot" class:collapsed={!open} aria-label="Chatbot">
    <button type="button" class="toggle display" aria-expanded={open} aria-controls={bodyId} onclick={() => (open = !open)}>
      {open ? 'Collapse chat' : 'Chat'}
    </button>
    <div id={bodyId} class="body" hidden={!open}>
      {#if session && conversationId}
        <ChatPanel {session} {conversationId} onview={(s) => (spec = s)} />
      {:else}
        <p class="placeholder">Not connected yet.</p>
      {/if}
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
  .chatbot {
    position: absolute;
    left: 1rem;
    top: 1rem;
    width: min(26rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border: var(--outline);
    background: var(--paper);
    box-shadow: 6px 6px 0 var(--ink);
  }
  .chatbot.collapsed {
    width: auto;
  }
  .toggle {
    align-self: stretch;
    border: 0;
    border-bottom: var(--outline);
    background: var(--pop-yellow);
    padding: 0.4rem 0.8rem;
    font-size: 1.1rem;
    cursor: pointer;
  }
  .chatbot.collapsed .toggle {
    border-bottom: 0;
  }
  .toggle:focus-visible {
    outline: 3px solid var(--pop-red);
    outline-offset: 2px;
  }
  .body {
    overflow: auto;
    min-height: 12rem;
  }
  .placeholder {
    margin: 1rem;
    font-weight: 700;
  }
</style>

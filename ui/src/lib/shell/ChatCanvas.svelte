<script lang="ts">
  // The simplest shell: the canvas fills the browser window (polka dots mark its extent). The
  // model and chat-mode picker is a drawer along the top and the chatbot is a drawer along the
  // bottom. Pull a handle to open it, drag to size it, click to open or close.
  import Canvas from '../canvas/Canvas.svelte';
  import ChatPanel from '../app/ChatPanel.svelte';
  import EdgeDrawer from './EdgeDrawer.svelte';
  import ModelModePicker from './ModelModePicker.svelte';
  import type { Session } from '../app/session';
  import type { Spec } from '@json-render/svelte';
  let { session = null, conversationId = '' }: { session?: Session | null; conversationId?: string } = $props();
  let spec = $state<Spec | null>(null);
</script>
<div class="window">
  <main class="canvas" aria-label="Canvas">
    <Canvas {spec} components={session?.components ?? []} />
  </main>
  <EdgeDrawer edge="top" label="Model and mode" closedLabel="Pull down for model and mode" height={0.3}>
    <ModelModePicker {session} />
  </EdgeDrawer>
  <EdgeDrawer edge="bottom" label="Chat" closedLabel="Pull up to chat">
    {#if session && conversationId}
      <ChatPanel {session} {conversationId} onview={(s) => (spec = s)} />
    {:else}
      <p class="placeholder">Not connected yet.</p>
    {/if}
  </EdgeDrawer>
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
  .placeholder {
    margin: 1rem 0;
    font-weight: 700;
  }
</style>

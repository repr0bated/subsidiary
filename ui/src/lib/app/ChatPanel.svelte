<script lang="ts">
  // The chat, as the AI SDK Chat class over the door transport. Views travel as data-spec parts
  // and are handed to the canvas; text shows in speech balloons.
  import { Chat } from '@ai-sdk/svelte';
  import { buildSpecFromParts, getTextFromParts, type Spec } from '@json-render/svelte';
  import { doorChatTransport } from '../chat/transport';
  import SpeechBalloon from '../comic/SpeechBalloon.svelte';
  import type { Session } from './session';

  let { session, conversationId, onview, incoming = null }: { session: Session; conversationId: string; onview: (spec: Spec) => void; incoming?: { id: number; text: string } | null } = $props();
  let lastIncoming = 0;

  // svelte-ignore state_referenced_locally
  const chat = new Chat({
    transport: doorChatTransport({ call: (p, m, a) => session.call(p, m, a), conversationId: () => conversationId, waitForCommit: session.waitForCommit })
  });
  let text = $state('');

  $effect(() => {
    const last = chat.messages.at(-1);
    if (last?.role === 'assistant') {
      const spec = buildSpecFromParts(last.parts as never);
      if (spec) onview(spec);
    }
  });

  $effect(() => {
    if (incoming && incoming.id !== lastIncoming) {
      lastIncoming = incoming.id;
      void chat.sendMessage({ text: incoming.text });
    }
  });

  function send() {
    const t = text.trim();
    if (!t) return;
    text = '';
    void chat.sendMessage({ text: t });
  }
</script>

<div class="chat">
  <ol class="msgs" role="log" aria-live="polite" aria-label="Conversation">
    {#each chat.messages as m (m.id)}
      <li class={m.role}>
        {#if m.role === 'assistant'}
          <SpeechBalloon text={getTextFromParts(m.parts as never)} speaker="The Business" />
        {:else}
          <p class="you">{getTextFromParts(m.parts as never)}</p>
        {/if}
      </li>
    {/each}
  </ol>
  {#if chat.status === 'submitted' || chat.status === 'streaming'}<p class="display busy" role="status">On it!</p>{/if}
  {#if chat.error}<p class="err" role="alert">That didn't go through. Nothing was retried.</p>{/if}
  <form onsubmit={(e) => { e.preventDefault(); send(); }}>
    <textarea bind:value={text} rows="2" aria-label="Message"></textarea>
    <button type="submit" class="display">Send</button>
  </form>
</div>

<style>
  .chat { display: grid; grid-template-rows: 1fr auto auto auto; height: 100%; gap: 0.5rem; padding: 0.5rem; }
  .msgs { list-style: none; margin: 0; padding: 0; overflow: auto; }
  .you { text-align: right; font-weight: 700; }
  form { display: flex; gap: 0.4rem; }
  textarea { flex: 1; border: var(--outline); font: inherit; padding: 0.4rem; }
  button { border: var(--outline); background: var(--pop-red); color: var(--paper); padding: 0 1rem; }
  .err { color: var(--pop-red); font-weight: 700; }
</style>

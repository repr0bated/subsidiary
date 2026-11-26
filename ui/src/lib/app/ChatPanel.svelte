<script lang="ts">
  // The chat, as the AI SDK Chat class over the door transport. Views travel as data-spec parts
  // and are handed to the canvas; text shows in speech balloons.
  import { Chat } from '@ai-sdk/svelte';
  import { buildSpecFromParts, getTextFromParts, type Spec } from '@json-render/svelte';
  import { doorChatTransport } from '../chat/transport';
  import type { Session } from './session';

  let { session, conversationId = '', onview, incoming = null }: { session: Session; conversationId?: string; onview: (spec: Spec) => void; incoming?: { id: number; text: string } | null } = $props();
  let lastIncoming = 0;

  // svelte-ignore state_referenced_locally
  const chat = new Chat({
    transport: doorChatTransport({ call: (p, m, a) => session.call(p, m, a), conversationId: () => conversationId || session.conversation(), waitForCommit: session.waitForCommit })
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
        <p class="bubble">{getTextFromParts(m.parts as never)}</p>
      </li>
    {/each}
  </ol>
  {#if chat.status === 'submitted' || chat.status === 'streaming'}<p class="display busy" role="status">On it!</p>{/if}
  {#if chat.error}<p class="err" role="alert">That didn't go through. Nothing was retried.</p>{/if}
  <form onsubmit={(e) => { e.preventDefault(); send(); }}>
    <textarea bind:value={text} rows="1" aria-label="Message" placeholder="Type your question…"
      onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}></textarea>
    <button type="submit" class="display" aria-label="Send">Pow!</button>
  </form>
</div>
<style>
  .chat { display: grid; grid-template-rows: 1fr auto auto auto; height: 100%; min-height: 0; }
  .msgs { list-style: none; margin: 0; padding: 0.75rem; overflow: auto; display: flex; flex-direction: column; gap: 0.65rem; min-height: 0; }
  .msgs li { display: flex; }
  .msgs li.user { justify-content: flex-end; }
  .bubble { margin: 0; max-width: min(85%, 68ch); padding: 0.6rem 0.75rem; border: 3px solid var(--ink); font-weight: 700; line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }
  .assistant .bubble { background: var(--paper); border-radius: 14px 14px 14px 2px; box-shadow: 3px 3px 0 var(--ink); }
  .user .bubble { background: var(--pop-yellow); border-radius: 14px 14px 2px 14px; box-shadow: -3px 3px 0 var(--ink); }
  .busy { margin: 0 0.75rem 0.4rem; }
  .err { margin: 0 0.75rem 0.4rem; color: var(--pop-red); font-weight: 700; }
  form { display: flex; gap: 0.4rem; padding: 0.5rem; background: var(--pop-yellow); border-top: 3px solid var(--ink); }
  textarea { flex: 1; border: 3px solid var(--ink); font: inherit; font-weight: 700; padding: 0.4rem 0.6rem; resize: none; }
  button { border: 3px solid var(--ink); background: var(--pop-red); color: var(--paper); padding: 0 0.9rem; font-size: 1.1rem; box-shadow: 3px 3px 0 var(--ink); cursor: pointer; }
  button:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--ink); }
</style>

<script lang="ts">
  // On the stand: search the record by meaning, pick an event, question the chatbot about it.
  import { searchOwnEvents, standQuestion, type ShownEvent } from './search';
  import type { Receipt } from '../door/types';

  let { call, onask }: { call: (p: string, m: string, a?: unknown) => Promise<Receipt>; onask: (q: string) => void } = $props();
  let query = $state('');
  let results = $state<ShownEvent[]>([]);
  let busy = $state(false);
  let picked = $state<ShownEvent | null>(null);
  let question = $state('Who, what, when, and who authorized it?');

  async function search() {
    busy = true;
    try {
      results = await searchOwnEvents(call, query);
    } finally {
      busy = false;
    }
  }
</script>

<section class="stand">
  <h2 class="display">On the stand</h2>
  <form onsubmit={(e) => { e.preventDefault(); void search(); }}>
    <input class="q" bind:value={query} placeholder="What did you do for the library last week?" aria-label="Search the record" />
    <button class="go display" type="submit" disabled={busy}>Search the record</button>
  </form>
  <ol class="results">
    {#each results as e (e.event_id)}
      <li class="panel" class:picked={picked?.event_id === e.event_id}>
        <button type="button" class="pick" onclick={() => (picked = e)}>
          <strong class="display">#{e.event_id} {e.plugin_id}.{e.method_name}</strong>
          <span class="hash">{e.event_hash}</span>
          {#if e.timestamp}<span>{e.timestamp}</span>{/if}
        </button>
      </li>
    {/each}
  </ol>
  {#if picked}
    <div class="panel ask">
      <label>Question for the witness <input bind:value={question} /></label>
      <button type="button" class="go display" onclick={() => onask(standQuestion(picked!, question))}>OBJECTION! Answer that</button>
    </div>
  {/if}
</section>

<style>
  .stand { display: grid; gap: 0.8rem; }
  form { display: flex; gap: 0.5rem; }
  .q, .ask input { flex: 1; border: var(--outline); padding: 0.5rem; font: inherit; }
  .go { border: var(--outline); background: var(--pop-blue); color: var(--paper); padding: 0.4rem 1rem; box-shadow: 3px 3px 0 var(--ink); }
  .results { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  .pick { all: unset; cursor: pointer; display: grid; gap: 0.2rem; width: 100%; }
  .picked { background: var(--pop-yellow); }
  .hash { font-family: ui-monospace, monospace; word-break: break-all; }
  .ask { display: grid; gap: 0.5rem; }
</style>

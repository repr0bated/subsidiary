<script lang="ts">
  // Trusted, human-only control: the proposal comes from get_pending_tool, never from a view spec.
  import { showProposal, type PendingProposal } from './approval';
  let { proposal, onanswer }: { proposal: PendingProposal; onanswer: (approved: boolean) => void } = $props();
  const shown = $derived(showProposal(proposal));
  let sent = $state(false);
  function answer(a: boolean) {
    if (sent) return;
    sent = true;
    onanswer(a);
  }
</script>
<section class="panel approval" aria-label="Approve this action">
  <p class="display ask">Shake on it?</p>
  <p><strong>{shown.plugin_id}.{shown.method}</strong></p>
  <pre>{JSON.stringify(shown.arguments, null, 2)}</pre>
  <div class="row">
    <button type="button" class="yes display" disabled={sent} onclick={() => answer(true)}>Approve</button>
    <button type="button" class="no display" disabled={sent} onclick={() => answer(false)}>Deny</button>
  </div>
</section>
<style>
  .approval { max-width: 32rem; }
  .ask { font-size: 1.6rem; margin: 0; }
  pre { background: var(--paper); border: 2px solid var(--ink); padding: 0.5rem; overflow: auto; max-height: 12rem; }
  .row { display: flex; gap: 0.6rem; }
  button { border: var(--outline); padding: 0.4rem 1rem; box-shadow: 3px 3px 0 var(--ink); }
  .yes { background: var(--pop-red); color: var(--paper); } .no { background: var(--paper); }
</style>

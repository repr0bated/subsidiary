<script lang="ts">
  // Candidate component: a receipt, stamped. Capability fields are stripped before rendering.
  import { stripCapabilities } from '../catalog/runnable';
  import type { Receipt } from '../door/types';
  let { receipt, anchored = false }: { receipt: Receipt; anchored?: boolean } = $props();
  const r = $derived(stripCapabilities(receipt));
</script>
<article class="panel receipt">
  <header class="display">Receipt</header>
  <dl>
    <dt>Operation</dt><dd>{r.operation_id ?? '—'}</dd>
    <dt>Outcome</dt><dd>{r.outcome === 'outcome_unknown' ? 'Unknown, not retried' : (r.outcome ?? '—')}</dd>
    <dt>Event</dt><dd>{r.event_id ?? '—'}</dd>
  </dl>
  {#if anchored}<div class="stamp display" aria-label="On the public record">On the record</div>{/if}
</article>
<style>
  .receipt { position: relative; font-family: ui-monospace, monospace; max-width: 28rem; }
  header { font-size: 1.4rem; margin-bottom: 0.4rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.2rem 0.8rem; margin: 0; } dt { font-weight: 700; } dd { margin: 0; word-break: break-all; }
  .stamp { position: absolute; right: 0.8rem; bottom: 0.6rem; transform: rotate(-12deg); color: var(--pop-red); border: 4px solid var(--pop-red); padding: 0.1rem 0.5rem; }
</style>

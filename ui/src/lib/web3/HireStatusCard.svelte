<script lang="ts">
  // DRAFT, /preview only, off by default (see hire-card.ts). With no PUBLIC_WEB3_RPC_URL this
  // renders nothing and makes no network call.
  import {
    PUBLIC_WEB3_ANCHOR_ADDRESS, PUBLIC_WEB3_HIRE_ADDRESS, PUBLIC_WEB3_HIRE_ID, PUBLIC_WEB3_RECEIPT_HEAD, PUBLIC_WEB3_RPC_URL
  } from '$app/env/public';
  import ReceiptCard from '../comic/ReceiptCard.svelte';
  import { loadHireCard, readWeb3Config, type Web3Config, type HireCardView } from './hire-card';

  function configure(): { config: Web3Config | null; error: string | null } {
    try {
      return {
        config: readWeb3Config({ PUBLIC_WEB3_RPC_URL, PUBLIC_WEB3_HIRE_ADDRESS, PUBLIC_WEB3_ANCHOR_ADDRESS, PUBLIC_WEB3_HIRE_ID, PUBLIC_WEB3_RECEIPT_HEAD }),
        error: null
      };
    } catch (e) {
      return { config: null, error: (e as Error).message };
    }
  }
  const { config, error: configError } = configure();
  let error = $state<string | null>(configError);

  let view = $state<HireCardView | null | undefined>(undefined);
  $effect(() => {
    if (!config) return;
    loadHireCard(config).then((v) => (view = v), (e: Error) => (error = e.message));
  });
</script>

{#if config || error}
  <section class="hire-card" aria-label="Hire on the public record (draft)">
    <p class="banner display">Draft: live chain read</p>
    {#if error}
      <p role="alert">Could not read the hire: {error}</p>
    {:else if view === undefined}
      <p>Reading the public record…</p>
    {:else if view === null}
      <p>No hire on this contract yet.</p>
    {:else}
      <ReceiptCard receipt={{ operation_id: `hire #${view.hireId}`, outcome: view.status }} anchored={view.receiptOk} />
      <dl class="panel">
        <dt>Status</dt><dd>{view.status}</dd>
        <dt>Anchored</dt><dd>{view.anchored ? `yes (${new Date(Number(view.anchoredAt) * 1000).toISOString()})` : 'no'}</dd>
        <dt>Receipt check</dt><dd>{view.receiptOk ? 'pass' : 'fail'}</dd>
        <dt>Work head</dt><dd>{view.workHead}</dd>
        <dt>Terms hash</dt><dd>{view.termsHash}</dd>
      </dl>
    {/if}
  </section>
{/if}

<style>
  .hire-card { margin: 1.5rem 0; display: grid; gap: 0.6rem; max-width: 40rem; }
  .banner { background: var(--ink); color: var(--paper); padding: 0.3rem 0.6rem; justify-self: start; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.2rem 0.8rem; margin: 0; font-family: ui-monospace, monospace; }
  dt { font-weight: 700; } dd { margin: 0; word-break: break-all; }
</style>

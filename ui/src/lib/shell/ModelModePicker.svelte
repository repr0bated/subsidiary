<script lang="ts">
  import { modeLabel, modesFor, type ChatMode } from './modes';
  import type { Session } from '../app/session';
  import type { Receipt } from '../door/types';
  // Options come from granted reads (chat_router.ListProviders / ListModels, project.get_context).
  // A pick is one call: chat_router.SetSelection or project.select_context (requirement 4).
  // Nothing is retried: a failed pick shows its outcome and the user picks again.
  let { session = null, subsidiary = true }: { session?: Session | null; subsidiary?: boolean } = $props();
  type Provider = { id: string; description?: string };
  type Route = { provider: string; model: string; available?: boolean };
  const modes = $derived(modesFor(subsidiary));
  let current = $state('');
  let providers = $state<Provider[]>([]);
  let routes = $state<Route[]>([]);
  let provider = $state('');
  let model = $state('');
  let note = $state('');
  const models = $derived(routes.filter((r) => r.provider === provider && r.available !== false));
  function unwrap(r: Receipt): Record<string, unknown> {
    const x = (r.result ?? {}) as Record<string, unknown>;
    return (x.result as Record<string, unknown>) ?? x;
  }
  function failed(r: Receipt): string {
    return r.success === false ? (r.outcome ?? 'refused') : '';
  }
  $effect(() => {
    const s = session;
    if (!s) return;
    void load(s);
  });
  async function load(s: Session) {
    try {
      const [p, m, c] = await Promise.all([s.listProviders(), s.listModels(), s.getContext()]);
      const bad = failed(p) || failed(m) || failed(c);
      if (bad) note = `Could not read the options: ${bad}`;
      providers = (unwrap(p).providers as Provider[]) ?? [];
      routes = (unwrap(m).model_routes as Route[]) ?? [];
      current = String(unwrap(c).mode ?? '');
    } catch (e) {
      note = `Could not read the options: ${(e as Error).message}`;
    }
  }
  async function pickMode(m: ChatMode) {
    if (!session) return;
    try {
      const r = await session.selectContext(m);
      const bad = failed(r);
      note = bad ? `Mode not changed: ${bad}` : '';
      if (!bad) current = m;
    } catch (e) {
      note = `Mode not changed: ${(e as Error).message}`;
    }
  }
  async function pickModel() {
    if (!session || !provider || !model) return;
    try {
      const r = await session.setSelection(provider, model);
      const bad = failed(r);
      note = bad ? `Model not changed: ${bad}` : `Model set to ${model}.`;
    } catch (e) {
      note = `Model not changed: ${(e as Error).message}`;
    }
  }
</script>
<div class="picker">
  <fieldset class="group">
    <legend class="display">Chat mode</legend>
    {#each modes as m (m)}
      <label class="mode" class:on={m === current}>
        <input type="radio" name="mode" value={m} checked={m === current} disabled={!session} onchange={() => pickMode(m)} />
        {modeLabel(m)}
      </label>
    {/each}
  </fieldset>
  <fieldset class="group">
    <legend class="display">Model</legend>
    <label>Provider
      <select bind:value={provider} disabled={!session || providers.length === 0} onchange={() => (model = '')}>
        <option value="" disabled>Choose a provider</option>
        {#each providers as p (p.id)}<option value={p.id}>{p.id}</option>{/each}
      </select>
    </label>
    <label>Model
      <select bind:value={model} disabled={!provider || models.length === 0}>
        <option value="" disabled>Choose a model</option>
        {#each models as r (r.model)}<option value={r.model}>{r.model}</option>{/each}
      </select>
    </label>
    <button type="button" class="set display" disabled={!session || !provider || !model} onclick={pickModel}>Set model</button>
  </fieldset>
  {#if !session}<p class="note">Not connected yet.</p>{:else if note}<p class="note" role="status">{note}</p>{/if}
</div>
<style>
  .picker { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 0.6rem; }
  .group { border: var(--outline); margin: 0; padding: 0.5rem 0.7rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.8rem; background: var(--paper); }
  legend { padding: 0 0.3rem; background: var(--pop-yellow); border: 3px solid var(--ink); }
  .mode { display: inline-flex; gap: 0.3rem; align-items: center; }
  .on { font-weight: 700; }
  select { margin-left: 0.3rem; max-width: 16rem; }
  .set { border: 3px solid var(--ink); background: var(--pop-yellow); padding: 0.2rem 0.7rem; cursor: pointer; }
  .set:disabled { opacity: 0.5; cursor: not-allowed; }
  .note { flex-basis: 100%; margin: 0; font-weight: 700; }
</style>

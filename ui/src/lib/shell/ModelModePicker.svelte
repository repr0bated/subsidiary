<script lang="ts">
  import { modeLabel, modesFor } from './modes';

  // Options come from granted reads (chat_router.ListProviders / ListModels, project.get_context);
  // selections go through chat_router.SetSelection and project.select_context (requirement 4).
  let { subsidiary = true, current = '' }: { subsidiary?: boolean; current?: string } = $props();
  const modes = $derived(modesFor(subsidiary));
</script>

<fieldset class="picker">
  <legend class="display">Chat mode</legend>
  {#each modes as m (m)}
    <label class="mode" class:on={m === current}><input type="radio" name="mode" value={m} checked={m === current} disabled /> {modeLabel(m)}</label>
  {/each}
</fieldset>

<style>
  .picker { border: var(--outline); margin: 0.6rem; padding: 0.5rem 0.7rem; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; background: var(--paper); }
  legend { padding: 0 0.3rem; background: var(--pop-yellow); border: 3px solid var(--ink); }
  .mode { display: inline-flex; gap: 0.3rem; align-items: center; }
  .on { font-weight: 700; }
</style>

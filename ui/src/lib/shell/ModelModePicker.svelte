<script lang="ts">
  import { modesFor } from './modes';

  // Options come from granted reads (chat_router.ListProviders / ListModels, project.get_context);
  // selections go through chat_router.SetSelection and project.select_context (requirement 4).
  let { subsidiary = true, current = '' }: { subsidiary?: boolean; current?: string } = $props();
  const modes = $derived(modesFor(subsidiary));
</script>

<fieldset>
  <legend>Chat mode</legend>
  {#each modes as m (m)}
    <label><input type="radio" name="mode" value={m} checked={m === current} disabled /> {m}</label>
  {/each}
</fieldset>

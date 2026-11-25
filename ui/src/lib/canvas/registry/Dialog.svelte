<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { getStateContext } from '@json-render/svelte';
  let { props, children }: BaseComponentProps<{ title: string; description?: string | null; openPath: string }> = $props();
  const state = getStateContext();
  const open = $derived(Boolean(props.openPath && state.get(props.openPath)));
</script>
{#if open}<div class="scrim" role="presentation"><div class="panel dlg" role="dialog" aria-modal="true" aria-label={props.title}><h3 class="display">{props.title}</h3>{#if props.description}<p>{props.description}</p>{/if}{@render children?.()}</div></div>{/if}
<style>.scrim { position: fixed; inset: 0; background: rgba(17,17,17,0.35); display: grid; place-items: center; z-index: 20; } .dlg { max-width: 34rem; width: 90%; }</style>

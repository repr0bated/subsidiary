<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ items: { title?: string; description?: string; src?: string }[] }> = $props();
  let i = $state(0);
  const items = $derived(props.items ?? []);
</script>
{#if items.length}<div class="panel car"><div class="slide"><strong class="display">{items[i]?.title ?? ''}</strong><p>{items[i]?.description ?? ''}</p></div><div class="nav"><button type="button" aria-label="Previous" onclick={() => (i = (i - 1 + items.length) % items.length)}>◀</button><span>{i + 1} / {items.length}</span><button type="button" aria-label="Next" onclick={() => (i = (i + 1) % items.length)}>▶</button></div></div>{/if}
<style>.nav { display: flex; gap: 0.6rem; align-items: center; } button { border: 3px solid var(--ink); background: var(--pop-yellow); }</style>

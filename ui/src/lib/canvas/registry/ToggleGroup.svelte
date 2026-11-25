<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  type Item = { label?: string; value: string };
  let { props, bindings, emit }: BaseComponentProps<{ items: Item[]; type?: string | null; value?: string | null }> = $props();
  const v = localBind(() => props.value ?? '', () => bindings?.value);
</script>
<div class="grp" role="group">{#each props.items ?? [] as it (it.value)}<button type="button" class="display" aria-pressed={v.current === it.value} onclick={() => { v.current = it.value; emit('change'); }}>{it.label ?? it.value}</button>{/each}</div>
<style>.grp { display: inline-flex; } button { border: 3px solid var(--ink); margin-left: -3px; background: var(--paper); padding: 0.3rem 0.8rem; } [aria-pressed='true'] { background: var(--pop-yellow); }</style>

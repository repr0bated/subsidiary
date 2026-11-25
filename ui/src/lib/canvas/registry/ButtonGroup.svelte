<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  type Btn = { label?: string; value: string };
  let { props, bindings, emit }: BaseComponentProps<{ buttons: Btn[]; selected?: string | null }> = $props();
  const v = localBind(() => props.selected ?? '', () => bindings?.selected);
</script>
<div class="grp" role="group">{#each props.buttons ?? [] as b (b.value)}<button type="button" class="display" aria-pressed={v.current === b.value} onclick={() => { v.current = b.value; emit('change'); }}>{b.label ?? b.value}</button>{/each}</div>
<style>.grp { display: inline-flex; gap: 0.4rem; } button { border: var(--outline); background: var(--pop-red); color: var(--paper); padding: 0.4rem 0.9rem; box-shadow: 3px 3px 0 var(--ink); } [aria-pressed='true'] { background: var(--pop-blue); }</style>

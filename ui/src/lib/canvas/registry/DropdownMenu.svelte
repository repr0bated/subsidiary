<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  type Item = { label?: string; value: string };
  let { props, bindings, emit }: BaseComponentProps<{ label: string; items: Item[]; value?: string | null }> = $props();
  const v = localBind(() => props.value ?? '', () => bindings?.value);
  let open = $state(false);
</script>
<div class="dd"><button type="button" class="display" aria-expanded={open} onclick={() => (open = !open)}>{props.label} ▾</button>{#if open}<ul class="panel menu" role="menu">{#each props.items ?? [] as it (it.value)}<li role="menuitem"><button type="button" onclick={() => { v.current = it.value; open = false; emit('select'); }}>{it.label ?? it.value}</button></li>{/each}</ul>{/if}</div>
<style>.dd { position: relative; display: inline-block; } button { border: 3px solid var(--ink); background: var(--pop-yellow); padding: 0.3rem 0.8rem; } .menu { position: absolute; z-index: 5; list-style: none; margin: 0.3rem 0 0; padding: 0.4rem; min-width: 10rem; } .menu button { width: 100%; text-align: left; background: var(--paper); border-width: 0 0 2px; }</style>

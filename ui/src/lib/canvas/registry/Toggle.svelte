<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  let { props, bindings, emit }: BaseComponentProps<{ label: string; pressed?: boolean | null; variant?: string | null }> = $props();
  const v = localBind(() => props.pressed ?? false, () => bindings?.pressed);
</script>
<button type="button" class="tg display" aria-pressed={v.current ?? false} onclick={() => { v.current = !v.current; emit('change'); }}>{props.label}</button>
<style>.tg { border: 3px solid var(--ink); background: var(--paper); padding: 0.3rem 0.8rem; } [aria-pressed='true'] { background: var(--pop-yellow); box-shadow: inset 3px 3px 0 var(--ink); }</style>

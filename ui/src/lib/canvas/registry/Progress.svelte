<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ value: number; max?: number | null; label?: string | null }> = $props();
  const pct = $derived(Math.max(0, Math.min(100, ((props.value ?? 0) / (props.max || 100)) * 100)));
</script>
<div class="progress" role="progressbar" aria-valuenow={props.value} aria-valuemax={props.max ?? 100} aria-label={props.label ?? 'Progress'}>
  <div class="fill ben-day" style:width={`${pct}%`}></div>
</div>
<style>.progress { border: var(--outline); height: 1.4rem; background: var(--paper); } .fill { height: 100%; }</style>

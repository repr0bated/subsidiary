<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { untrack } from 'svelte';
  type Tab = { label?: string; value: string };
  let { props, children }: BaseComponentProps<{ tabs: Tab[]; defaultValue?: string | null; value?: string | null }> = $props();
  let current = $state(untrack(() => props.value ?? props.defaultValue ?? props.tabs?.[0]?.value ?? ''));
</script>
<div class="tabs">
  <div role="tablist" class="list">{#each props.tabs ?? [] as t (t.value)}<button type="button" role="tab" class="display" aria-selected={t.value === current} onclick={() => (current = t.value)}>{t.label ?? t.value}</button>{/each}</div>
  <div role="tabpanel" class="panel">{@render children?.()}</div>
</div>
<style>.list { display: flex; gap: 0.3rem; } button { border: 3px solid var(--ink); border-bottom: 0; background: var(--paper); padding: 0.3rem 0.8rem; } [aria-selected='true'] { background: var(--pop-yellow); }</style>

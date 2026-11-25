<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props, children }: BaseComponentProps<{ columns?: number | null; gap?: string | null }> = $props();
</script>
<div class="grid" style:grid-template-columns={`repeat(${Math.max(1, Math.min(6, props.columns ?? 2))}, minmax(0, 1fr))`}>
  {@render children?.()}
</div>
<style>.grid { display: grid; gap: 1rem; }</style>

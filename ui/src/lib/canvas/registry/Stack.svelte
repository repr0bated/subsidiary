<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props, children }: BaseComponentProps<{ direction?: string | null; gap?: string | null; align?: string | null; justify?: string | null }> = $props();
</script>
<div class="stack" style:flex-direction={props.direction === 'horizontal' ? 'row' : 'column'} style:align-items={props.align ?? 'stretch'} style:justify-content={props.justify ?? 'flex-start'} style:gap={props.gap === 'lg' ? '1.5rem' : props.gap === 'sm' ? '0.5rem' : '1rem'}>
  {@render children?.()}
</div>
<style>.stack { display: flex; }</style>

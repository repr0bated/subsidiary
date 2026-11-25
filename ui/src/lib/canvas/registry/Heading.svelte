<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ text: string; level?: string | null }> = $props();
  const level = $derived(['h1', 'h2', 'h3', 'h4'].includes(props.level ?? '') ? (props.level as string) : 'h2');
</script>
<svelte:element this={level} class="display heading">{props.text}</svelte:element>
<style>.heading { margin: 0.5rem 0; -webkit-text-stroke: 1px var(--ink); color: var(--pop-yellow); text-shadow: 3px 3px 0 var(--ink); }</style>

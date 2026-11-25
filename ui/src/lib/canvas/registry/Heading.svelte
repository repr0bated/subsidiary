<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ text: string; level?: string | null }> = $props();
  const level = $derived(['h1', 'h2', 'h3', 'h4'].includes(props.level ?? '') ? (props.level as string) : 'h2');
</script>
<svelte:element this={level} class="display heading">{props.text}</svelte:element>
<style>.heading { margin: 0.5rem 0; font-size: 2.6rem; letter-spacing: 0.06em; color: var(--pop-yellow); -webkit-text-stroke: 0.6px var(--ink); text-shadow: 3px 3px 0 var(--ink); }</style>

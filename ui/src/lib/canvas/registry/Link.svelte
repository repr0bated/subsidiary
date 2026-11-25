<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ label: string; href: string }> = $props();
  // Only same-origin or relative links; the UI never sends the human to an arbitrary site.
  const safe = $derived(typeof props.href === 'string' && (props.href.startsWith('/') || props.href.startsWith('#')) ? props.href : undefined);
</script>
{#if safe}<a class="link" href={safe}>{props.label}</a>{:else}<span class="link off">{props.label}</span>{/if}
<style>.link { color: var(--pop-blue); font-weight: 700; text-decoration: underline 3px; } .off { color: inherit; text-decoration: none; }</style>

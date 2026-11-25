<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ text: string; variant?: string | null }> = $props();
</script>
<p class="text" class:muted={props.variant === 'muted'} class:lead={props.variant === 'lead'}>{props.text}</p>
<style>.text { margin: 0.4rem 0; line-height: 1.45; } .muted { opacity: 0.7; } .lead { font-size: 1.2rem; font-weight: 700; }</style>

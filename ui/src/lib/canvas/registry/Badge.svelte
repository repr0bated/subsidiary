<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ text: string; variant?: string | null }> = $props();
</script>
<span class="badge display" data-variant={props.variant ?? 'default'}>{props.text}</span>
<style>
  .badge { display: inline-block; border: 3px solid var(--ink); padding: 0.1rem 0.5rem; background: var(--pop-yellow); transform: rotate(-2deg); }
  [data-variant='destructive'] { background: var(--pop-red); color: var(--paper); }
  [data-variant='secondary'] { background: var(--pop-blue); color: var(--paper); }
</style>

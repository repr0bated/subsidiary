<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props, children }: BaseComponentProps<{ title?: string | null; description?: string | null; maxWidth?: string | null; centered?: boolean | null }> = $props();
</script>
<section class="panel card" class:centered={props.centered} data-width={props.maxWidth ?? 'full'}>
  {#if props.title}<h3 class="display">{props.title}</h3>{/if}
  {#if props.description}<p class="narration">{props.description}</p>{/if}
  {@render children?.()}
</section>
<style>
  .card { margin: 0.75rem 0; }
  .centered { margin-inline: auto; }
  [data-width='sm'] { max-width: 24rem; } [data-width='md'] { max-width: 36rem; } [data-width='lg'] { max-width: 52rem; }
  h3 { margin: 0 0 0.5rem; font-size: 1.6rem; }
  .narration { display: inline-block; background: var(--pop-yellow); border: var(--outline); padding: 0.25rem 0.5rem; margin: 0 0 0.75rem; }
</style>

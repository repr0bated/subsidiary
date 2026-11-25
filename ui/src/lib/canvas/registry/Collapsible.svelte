<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { untrack } from 'svelte';
  let { props, children }: BaseComponentProps<{ title: string; defaultOpen?: boolean | null }> = $props();
  let open = $state(untrack(() => props.defaultOpen ?? false));
</script>
<details class="panel col" bind:open><summary class="display">{props.title}</summary>{@render children?.()}</details>
<style>.col { margin: 0.6rem 0; } summary { cursor: pointer; font-size: 1.2rem; }</style>

<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ orientation?: string | null }> = $props();
</script>
<hr class="sep" class:vertical={props.orientation === 'vertical'} />
<style>.sep { border: 0; border-top: var(--outline); margin: 1rem 0; } .vertical { border-top: 0; border-left: var(--outline); height: 100%; margin: 0 1rem; }</style>

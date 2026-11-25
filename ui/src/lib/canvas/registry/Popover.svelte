<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ trigger: string; content: string }> = $props();
  let open = $state(false);
</script>
<span class="pop"><button type="button" class="display" aria-expanded={open} onclick={() => (open = !open)}>{props.trigger}</button>{#if open}<span class="panel body" role="dialog">{props.content}</span>{/if}</span>
<style>.pop { position: relative; display: inline-block; } button { border: 3px solid var(--ink); background: var(--pop-yellow); padding: 0.2rem 0.6rem; } .body { position: absolute; top: 110%; left: 0; z-index: 5; min-width: 12rem; }</style>

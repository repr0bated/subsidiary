<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ content: string; text: string }> = $props();
</script>
<button type="button" class="tip">{props.text}<span class="bubble" role="tooltip">{props.content}</span></button>
<style>.tip { position: relative; border: 0; background: none; font: inherit; padding: 0; border-bottom: 2px dotted var(--ink); } .bubble { display: none; position: absolute; bottom: 125%; left: 0; background: var(--paper); border: 3px solid var(--ink); padding: 0.2rem 0.5rem; white-space: nowrap; z-index: 5; } .tip:hover .bubble, .tip:focus .bubble { display: block; }</style>

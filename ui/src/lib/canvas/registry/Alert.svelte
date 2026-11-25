<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ title?: string | null; message: string; type?: string | null }> = $props();
</script>
<div class="panel alert ben-day" class:blue={props.type === 'info'} class:yellow={props.type === 'warning'} role={props.type === 'error' ? 'alert' : 'status'}>
  {#if props.title}<strong class="display">{props.title}</strong>{/if}
  <p class="bubble">{props.message}</p>
</div>
<style>.alert { margin: 0.75rem 0; } .bubble { background: var(--paper); border: var(--outline); padding: 0.5rem 0.75rem; margin: 0.5rem 0 0; }</style>

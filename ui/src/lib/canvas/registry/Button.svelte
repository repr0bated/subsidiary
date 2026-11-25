<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  // A not-runnable operation renders with no handler: present, disabled, never run.
  let { props, emit }: BaseComponentProps<{ label: string; variant?: string | null; disabled?: boolean | null }> = $props();
</script>
<button type="button" class="btn display" data-variant={props.variant ?? 'default'} disabled={props.disabled ?? false} onclick={() => emit('press')}>{props.label}</button>
<style>
  .btn { border: var(--outline); background: var(--pop-red); color: var(--paper); padding: 0.5rem 1rem; font-size: 1.1rem; box-shadow: 4px 4px 0 var(--ink); cursor: pointer; }
  .btn:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--ink); }
  .btn:disabled { background: var(--paper); color: var(--ink); opacity: 0.6; cursor: not-allowed; }
  [data-variant='secondary'] { background: var(--pop-blue); } [data-variant='outline'] { background: var(--paper); color: var(--ink); }
</style>

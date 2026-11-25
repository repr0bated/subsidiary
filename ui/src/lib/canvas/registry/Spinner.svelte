<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ size?: string | null; label?: string | null }> = $props();
</script>
<span class="display spinner" role="status">{props.label ?? 'On it!'}</span>
<style>.spinner { display: inline-block; padding: 0.3rem 0.6rem; border: var(--outline); background: var(--pop-yellow); animation: wobble 0.6s ease-in-out infinite alternate; } @keyframes wobble { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }</style>

<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ width?: string | null; height?: string | null; rounded?: boolean | null }> = $props();
</script>
<div class="skel ben-day yellow" style:width={props.width ?? '100%'} style:height={props.height ?? '1.2rem'} class:rounded={props.rounded} aria-hidden="true"></div>
<style>.skel { border: 3px solid var(--ink); opacity: 0.6; } .rounded { border-radius: 999px; }</style>

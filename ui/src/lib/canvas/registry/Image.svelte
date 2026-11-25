<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ src: string; alt?: string | null; width?: number | null; height?: number | null }> = $props();
</script>
<img class="panel img" src={props.src} alt={props.alt ?? ''} width={props.width ?? undefined} height={props.height ?? undefined} />
<style>.img { padding: 0; max-width: 100%; display: block; }</style>

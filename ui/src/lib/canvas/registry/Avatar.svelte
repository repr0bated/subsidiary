<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ src?: string | null; name: string; size?: string | null }> = $props();
  const initials = $derived((props.name ?? '?').split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase());
</script>
<span class="avatar display" data-size={props.size ?? 'md'} title={props.name}>{#if props.src}<img src={props.src} alt={props.name} />{:else}{initials}{/if}</span>
<style>.avatar { display: inline-grid; place-items: center; width: 2.6rem; height: 2.6rem; border: var(--outline); border-radius: 50%; background: var(--pop-yellow); overflow: hidden; } [data-size='lg'] { width: 4rem; height: 4rem; } [data-size='sm'] { width: 1.8rem; height: 1.8rem; } img { width: 100%; height: 100%; object-fit: cover; }</style>

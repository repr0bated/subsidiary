<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  let { props }: BaseComponentProps<{ items: { title?: string; content?: string; value?: string }[]; type?: string | null }> = $props();
</script>
<div class="acc">{#each props.items ?? [] as it, i (it.value ?? i)}<details class="panel item" name={props.type === 'single' ? 'acc' : undefined}><summary class="display">{it.title ?? ''}</summary><p>{it.content ?? ''}</p></details>{/each}</div>
<style>.item { margin: 0.4rem 0; padding: 0.6rem 1rem; } summary { cursor: pointer; }</style>

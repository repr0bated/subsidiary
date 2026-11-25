<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { stripCapabilities } from '../../catalog/runnable';
  type Col = { key?: string; label?: string; header?: string } | string;
  let { props }: BaseComponentProps<{ columns: Col[]; rows: Record<string, unknown>[] | unknown[][]; caption?: string | null }> = $props();
  const cols = $derived((props.columns ?? []).map((c) => (typeof c === 'string' ? { key: c, label: c } : { key: c.key ?? '', label: c.label ?? c.header ?? c.key ?? '' })));
  const rows = $derived(stripCapabilities(props.rows ?? []) as (Record<string, unknown> | unknown[])[]);
  const cell = (r: Record<string, unknown> | unknown[], i: number, key: string) => String((Array.isArray(r) ? r[i] : r[key]) ?? '');
</script>
<table class="panel tbl">
  {#if props.caption}<caption class="display">{props.caption}</caption>{/if}
  <thead><tr>{#each cols as c (c.key)}<th class="display">{c.label}</th>{/each}</tr></thead>
  <tbody>{#each rows as r, ri (ri)}<tr>{#each cols as c, ci (c.key)}<td>{cell(r, ci, c.key)}</td>{/each}</tr>{/each}</tbody>
</table>
<style>.tbl { border-collapse: collapse; width: 100%; box-sizing: border-box; box-shadow: none; margin-top: 0.5rem; } th, td { border: 2px solid var(--ink); padding: 0.35rem 0.6rem; text-align: left; } th { background: var(--pop-yellow); }</style>

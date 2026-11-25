<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  let { props, bindings, emit }: BaseComponentProps<{ totalPages: number; page?: number | null }> = $props();
  const p = localBind(() => props.page ?? 1, () => bindings?.page);
  const go = (n: number) => { p.current = Math.max(1, Math.min(props.totalPages ?? 1, n)); emit('change'); };
</script>
<nav class="pg" aria-label="Pages"><button type="button" onclick={() => go((p.current ?? 1) - 1)} disabled={(p.current ?? 1) <= 1}>◀</button><span class="display">{p.current} / {props.totalPages}</span><button type="button" onclick={() => go((p.current ?? 1) + 1)} disabled={(p.current ?? 1) >= (props.totalPages ?? 1)}>▶</button></nav>
<style>.pg { display: inline-flex; gap: 0.6rem; align-items: center; } button { border: 3px solid var(--ink); background: var(--pop-yellow); padding: 0.2rem 0.6rem; } button:disabled { opacity: 0.4; }</style>

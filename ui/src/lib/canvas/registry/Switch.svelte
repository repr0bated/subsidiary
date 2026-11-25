<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  let { props, bindings }: BaseComponentProps<{ label?: string | null; name: string; checked?: boolean | null }> = $props();
  const v = localBind(() => props.checked ?? false, () => bindings?.checked);
</script>
<label class="row"><input type="checkbox" role="switch" name={props.name} checked={v.current ?? false} onchange={(e) => (v.current = e.currentTarget.checked)} /> <span class="label">{props.label ?? props.name}</span></label>
<style>.row { display: inline-flex; gap: 0.4rem; align-items: center; } input { width: 1.3rem; height: 1.3rem; accent-color: var(--pop-red); } .label { font-family: var(--font-display); }</style>

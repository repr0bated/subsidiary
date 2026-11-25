<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  let { props, bindings }: BaseComponentProps<{ label?: string | null; min?: number | null; max?: number | null; step?: number | null; value?: number | null }> = $props();
  const v = localBind(() => props.value ?? props.min ?? 0, () => bindings?.value);
</script>
<label class="field"><span class="label">{props.label ?? ''} {v.current}</span><input type="range" min={props.min ?? 0} max={props.max ?? 100} step={props.step ?? 1} value={v.current ?? 0} oninput={(e) => (v.current = Number(e.currentTarget.value))} /></label>
<style>.field { display: grid; gap: 0.25rem; } .label { font-family: var(--font-display); } input { accent-color: var(--pop-blue); }</style>

<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  type Opt = { label?: string; value: string } | string;
  let { props, bindings }: BaseComponentProps<{ label?: string | null; name: string; options: Opt[]; value?: string | null }> = $props();
  const v = localBind(() => props.value ?? '', () => bindings?.value);
  const opts = $derived((props.options ?? []).map((o) => (typeof o === 'string' ? { label: o, value: o } : { label: o.label ?? o.value, value: o.value })));
</script>
<fieldset class="field"><legend class="label">{props.label ?? props.name}</legend>{#each opts as o (o.value)}<label><input type="radio" name={props.name} value={o.value} checked={v.current === o.value} onchange={() => (v.current = o.value)} /> {o.label}</label>{/each}</fieldset>
<style>.field { display: grid; gap: 0.25rem; margin: 0.4rem 0; } .label { font-family: var(--font-display); letter-spacing: 0.04em; } input { border: 3px solid var(--ink); padding: 0.4rem; font: inherit; background: var(--paper); } fieldset { border: 3px solid var(--ink); }</style>

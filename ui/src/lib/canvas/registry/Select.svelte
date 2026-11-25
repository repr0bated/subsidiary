<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  type Opt = { label?: string; value: string } | string;
  let { props, bindings }: BaseComponentProps<{ label?: string | null; name: string; options: Opt[]; placeholder?: string | null; value?: string | null }> = $props();
  const v = localBind(() => props.value ?? '', () => bindings?.value);
  const opts = $derived((props.options ?? []).map((o) => (typeof o === 'string' ? { label: o, value: o } : { label: o.label ?? o.value, value: o.value })));
</script>
<label class="field"><span class="label">{props.label ?? props.name}</span><select name={props.name} value={v.current ?? ''} onchange={(e) => (v.current = e.currentTarget.value)}>{#if props.placeholder}<option value="" disabled>{props.placeholder}</option>{/if}{#each opts as o (o.value)}<option value={o.value}>{o.label}</option>{/each}</select></label>
<style>.field { display: grid; gap: 0.25rem; margin: 0.4rem 0; } .label { font-family: var(--font-display); letter-spacing: 0.04em; } select { border: 3px solid var(--ink); padding: 0.4rem; font: inherit; background: var(--paper); }</style>

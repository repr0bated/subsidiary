<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import { localBind } from './bind';
  let { props, bindings }: BaseComponentProps<{ label?: string | null; name: string; placeholder?: string | null; rows?: number | null; value?: string | null }> = $props();
  const v = localBind(() => props.value ?? '', () => bindings?.value);
</script>
<label class="field"><span class="label">{props.label ?? props.name}</span><textarea name={props.name} rows={props.rows ?? 4} placeholder={props.placeholder ?? ''} value={v.current ?? ''} oninput={(e) => (v.current = e.currentTarget.value)}></textarea></label>
<style>.field { display: grid; gap: 0.25rem; margin: 0.4rem 0; } .label { font-family: var(--font-display); letter-spacing: 0.04em; } textarea { border: 3px solid var(--ink); padding: 0.4rem; font: inherit; background: var(--paper); }</style>

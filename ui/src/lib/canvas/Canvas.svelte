<script lang="ts">
  // The chatbot renders views here: sealed components only, styled by the comic registry,
  // feed data read-only under /plugins, and only sealed actions (design §7).
  import { defineRegistry, JsonUIProvider, Renderer, type Spec } from '@json-render/svelte';
  import { catalogFromSealed, type SealedComponent } from '../catalog/sealed-catalog';
  import { comicComponents } from './registry';
  import { handlersFor, type SealedAction } from './actions';

  let {
    spec = null,
    components = [],
    actions = [],
    feeds = {}
  }: { spec?: Spec | null; components?: SealedComponent[]; actions?: SealedAction[]; feeds?: Record<string, unknown> } = $props();

  const sealedNames = $derived(new Set(components.map((c) => c.name)));
  const implemented = $derived(Object.fromEntries(Object.entries(comicComponents).filter(([n]) => sealedNames.has(n))));
  const registry = $derived(
    components.length ? defineRegistry(catalogFromSealed(components), { components: implemented as never, actions: handlersFor(actions) as never }).registry : null
  );
</script>

<div class="canvas-area" role="region" aria-live="polite" aria-label="Canvas">
  {#if spec && registry}
    <JsonUIProvider initialState={{ plugins: feeds }}>
      <Renderer {spec} {registry} />
    </JsonUIProvider>
  {/if}
</div>

<style>
  .canvas-area { min-height: 60vh; padding: 1rem; }
</style>

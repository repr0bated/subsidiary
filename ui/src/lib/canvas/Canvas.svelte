<script lang="ts">
  // The chatbot renders views here: sealed components only, styled by the comic registry,
  // feed data read-only under /plugins, and only sealed actions (design §7).
  import { defineRegistry, JsonUIProvider, Renderer, type Spec } from '@json-render/svelte';
  import { catalogFromSealed, type SealedComponent } from '../catalog/sealed-catalog';
  import { withComicComponents } from '../catalog/comic-components';
  import { comicComponents } from './registry';
  import { handlersFor, type SealedAction } from './actions';

  let {
    spec = null,
    components = [],
    actions = [],
    feeds = {},
    label = 'Canvas',
    compact = false
  }: { spec?: Spec | null; components?: SealedComponent[]; actions?: SealedAction[]; feeds?: Record<string, unknown>; label?: string; compact?: boolean } = $props();

  const all = $derived(components.length ? withComicComponents(components) : []);
  const sealedNames = $derived(new Set(all.map((c) => c.name)));
  const implemented = $derived(Object.fromEntries(Object.entries(comicComponents).filter(([n]) => sealedNames.has(n))));
  const registry = $derived(
    all.length ? defineRegistry(catalogFromSealed(all), { components: implemented as never, actions: handlersFor(actions) as never }).registry : null
  );
</script>

<div class="canvas-area" class:compact role="region" aria-live="polite" aria-label={label}>
  {#if spec && registry}
    <JsonUIProvider initialState={{ plugins: feeds }}>
      <Renderer {spec} {registry} />
    </JsonUIProvider>
  {/if}
</div>

<style>
  .canvas-area { min-height: 60vh; padding: 1rem; }
  .compact { min-height: 0; padding: 0; }
</style>

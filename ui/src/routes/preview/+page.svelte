<script lang="ts">
  // Preview only: sample spec and sample receipt, NOT real data (Prerequisite: no view presents
  // data as accurate before the state fix). Schemas are permissive here; the real catalog is
  // built from json_render.list_components at runtime.
  import { defineRegistry, JsonUIProvider, Renderer } from '@json-render/svelte';
  import { catalogFromSealed } from '../../lib/catalog/sealed-catalog';
  import { comicComponents } from '../../lib/canvas/registry';
  import Burst from '../../lib/comic/Burst.svelte';
  import SpeechBalloon from '../../lib/comic/SpeechBalloon.svelte';
  import ReceiptCard from '../../lib/comic/ReceiptCard.svelte';
  import { BURSTS, type BackendEvent } from '../../lib/comic/bursts';

  const catalog = catalogFromSealed(Object.keys(comicComponents).map((name) => ({ name, props_schema: {}, slots: ['default'] })));
  const { registry } = defineRegistry(catalog, { components: comicComponents as never });

  const spec = {
    root: 'page',
    elements: {
      page: { type: 'Stack', props: { direction: 'vertical', gap: 'md' }, children: ['title', 'card'] },
      title: { type: 'Heading', props: { text: 'Have I got a deal for you!', level: 'h1' }, children: [] },
      card: { type: 'Card', props: { title: 'Compliance review', description: 'MEANWHILE, ON THE LOT…' }, children: ['pitch', 'badges', 'table', 'actions'] },
      pitch: { type: 'Text', props: { text: "I've got everything you need right here, no need to go searching!", variant: 'lead' }, children: [] },
      badges: { type: 'Stack', props: { direction: 'horizontal', gap: 'sm' }, children: ['b1', 'b2'] },
      b1: { type: 'Badge', props: { text: 'Receipted', variant: 'default' }, children: [] },
      b2: { type: 'Badge', props: { text: 'Warranty 7 days', variant: 'secondary' }, children: [] },
      table: { type: 'Table', props: { caption: 'Sample only', columns: ['service', 'status'], rows: [{ service: 'OSCAL review', status: 'available' }, { service: 'Fleet audit', status: 'not available to you' }] }, children: [] },
      actions: { type: 'Stack', props: { direction: 'horizontal', gap: 'sm' }, children: ['hire', 'notrun'] },
      hire: { type: 'Button', props: { label: 'Shake on it', variant: 'default' }, children: [] },
      notrun: { type: 'Button', props: { label: 'Fleet audit', variant: 'outline', disabled: true }, children: [] }
    }
  };
  const events = Object.keys(BURSTS) as BackendEvent[];
</script>

<main class="preview">
  <p class="banner display">Preview: sample data, not a real record</p>
  <SpeechBalloon text="Step right up, friend! Don't take my word for it, check the receipt!" speaker="The Business" />
  <JsonUIProvider initialState={{}}>
    <Renderer {spec} {registry} />
  </JsonUIProvider>
  <section class="row">{#each events as e (e)}<Burst event={e} />{/each}</section>
  <ReceiptCard receipt={{ operation_id: 'sample-op', outcome: 'completed', event_id: 42, required_capability: 'never.shown' }} anchored />
</main>

<style>
  .preview { padding: 1.5rem; max-width: 64rem; margin: 0 auto; }
  .banner { background: var(--ink); color: var(--paper); padding: 0.3rem 0.6rem; display: inline-block; }
  .row { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0; }
</style>

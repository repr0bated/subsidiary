<script lang="ts">
  // The page is served by the container's door, so the door is this page's own origin. The host
  // handles identity; nothing here mints or sends one.
  import { onMount } from 'svelte';
  import ChatCanvas from '../lib/shell/ChatCanvas.svelte';
  import { Session } from '../lib/app/session';
  import { createDoor } from '../lib/door/client';
  let session = $state<Session | null>(null);
  onMount(() => {
    const abort = new AbortController();
    const { door, subscribe } = createDoor({ baseUrl: window.location.origin, catalog: () => s.catalog });
    const s: Session = new Session(door, subscribe);
    void s.loadCatalog().then(
      () => {
        session = s;
        void s.run(abort.signal);
      },
      () => {
        session = null;
      }
    );
    return () => abort.abort();
  });
</script>
<ChatCanvas {session} />

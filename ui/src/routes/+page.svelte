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
    const { door, subscribe } = createDoor({ baseUrl: window.location.origin });
    const s = new Session(door, subscribe);
    // Components are read before the canvas mounts; schema and state arrive in the feed.
    void s.loadComponents().then(
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

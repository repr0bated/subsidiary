<script lang="ts">
  // Candidate component (not in the sealed catalog yet; register with json_render.save_candidate).
  import { burstFor, type BackendEvent } from './bursts';
  let { event }: { event: BackendEvent } = $props();
  const b = $derived(burstFor(event));
</script>
<div class="burst display" data-color={b.color} data-long={b.word.length > 6} role="status" aria-label={b.label}>
  <span class="word" aria-hidden="true">{b.word}</span>
</div>
<style>
  .burst { display: inline-grid; place-items: center; width: 11rem; height: 8rem; font-size: 2rem; color: var(--ink);
    background-color: var(--pop-yellow);
    background-image: radial-gradient(rgba(0,0,0,0.18) 26%, transparent 29%); background-size: 8px 8px;
    clip-path: polygon(50% 0, 61% 18%, 82% 6%, 78% 30%, 100% 34%, 82% 50%, 100% 66%, 78% 70%, 82% 94%, 61% 82%, 50% 100%, 39% 82%, 18% 94%, 22% 70%, 0 66%, 18% 50%, 0 34%, 22% 30%, 18% 6%, 39% 18%);
    animation: pop 220ms ease-out; }
  [data-long='true'] { width: 14rem; font-size: 1.55rem; }
  .word { padding: 0 2.2rem; -webkit-text-stroke: 1px var(--ink); text-shadow: 2px 2px 0 var(--ink); }
  [data-color='red'] { background: var(--pop-red); color: var(--paper); }
  [data-color='blue'] { background: var(--pop-blue); color: var(--paper); }
  @keyframes pop { from { transform: scale(0.4) rotate(-12deg); } to { transform: scale(1) rotate(-4deg); } }
</style>

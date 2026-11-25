<script lang="ts">
  // Candidate component: the identity's own voice in a speech balloon.
  let { text, speaker = '' }: { text: string; speaker?: string } = $props();
</script>
<figure class="balloon">
  <blockquote>{text}</blockquote>
  {#if speaker}<figcaption class="display">{speaker}</figcaption>{/if}
</figure>
<style>
  .balloon { position: relative; margin: 1rem 0 2rem; background: var(--paper); border: var(--outline); border-radius: 50% / 40%; padding: 1.5rem 2rem; max-width: 34rem; }
  .balloon::after { content: ''; position: absolute; bottom: -26px; left: 3rem; border: 14px solid transparent; border-top: 24px solid var(--ink); }
  blockquote { margin: 0; font-size: 1.15rem; font-weight: 700; }
  figcaption { position: absolute; top: -0.9rem; left: 1.5rem; background: var(--pop-yellow); border: 3px solid var(--ink); padding: 0 0.4rem; }
</style>

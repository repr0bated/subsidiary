<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import SpeechBalloon from '../../comic/SpeechBalloon.svelte';
  let { props }: BaseComponentProps<{ text: string; speaker?: string | null }> = $props();
</script>
<SpeechBalloon text={props.text} speaker={props.speaker ?? ''} />

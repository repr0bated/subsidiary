<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import Burst from '../../comic/Burst.svelte';
  import type { BackendEvent } from '../../comic/bursts';
  let { props }: BaseComponentProps<{ event: BackendEvent }> = $props();
</script>
<Burst event={props.event} />

<script lang="ts">
  import type { BaseComponentProps } from '@json-render/svelte';
  import ReceiptCard from '../../comic/ReceiptCard.svelte';
  import type { Receipt } from '../../door/types';
  let { props }: BaseComponentProps<{ receipt: Receipt; anchored?: boolean | null }> = $props();
</script>
<ReceiptCard receipt={props.receipt} anchored={props.anchored ?? false} />

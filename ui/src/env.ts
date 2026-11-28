import { defineEnvVars } from '@sveltejs/kit/env';

// Public, build-time values for the DRAFT hire card on /preview (src/lib/web3/hire-card.ts).
// All optional and unset by default: then the card renders nothing and the UI makes no chain
// call. Whether the browser may call a chain RPC is an open owner decision (chat-canvas-ui §2).
const optional = (description: string) => ({ public: true, static: true, description, schema: (v: string | undefined) => v });

export const variables = defineEnvVars({
  PUBLIC_WEB3_RPC_URL: optional('Draft hire card: JSON-RPC URL for read-only eth_call (unset = card off)'),
  PUBLIC_WEB3_HIRE_ADDRESS: optional('Draft hire card: HireContract address (required when the RPC URL is set)'),
  PUBLIC_WEB3_ANCHOR_ADDRESS: optional('Draft hire card: EtchedAnchor address (read from HireContract.anchor() when unset)'),
  PUBLIC_WEB3_HIRE_ID: optional('Draft hire card: hire id to show (latest hire when unset)'),
  PUBLIC_WEB3_RECEIPT_HEAD: optional("Draft hire card: receipt head to check (the hire's work head when unset)")
});

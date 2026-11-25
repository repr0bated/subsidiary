# Subsidiary research wiki

Research notes for building the sealed, chatbot-as-canvas surface. Written for people and for embedding into the chatbot knowledge base. Each page is one topic, starts with a header (topic, sources, retrieved date), and ends with what it means for Subsidiary.

Retrieved: 2026-11-19. Notes are paraphrased from the cited pages. Anything marked VERIFY was not confirmed in the source and must be checked before use.

Pages:
- json-render.md: catalog-constrained generative UI with a Svelte 5 renderer
- ai-sdk-svelte.md: Vercel AI SDK chat, streaming and tools in SvelteKit
- chat-sdk.md: Vercel Chat SDK (multi-platform bots)
- svelte-compiler-and-sveltekit.md: what the Svelte compiler exposes, and what SvelteKit adds
- subsidiary-implications.md: decisions and open questions for this project
- chat-as-canvas-route.md: the chosen route (precompiled catalog rendered inline from message parts), what is confirmed, and where it conflicts with project rules
- backend-source-of-truth.md: use the full backend (grants, capabilities, agents, schema, tracker, hashchain); what Subsidiary owns versus must not reimplement
- embedding-plan.md: how to turn this wiki into a chatbot knowledge base
- exchange-point-and-schema-feed.md: how the UI sets mode and model, what schema the bridge delivers, the FUSE layout, and what was observed on the live mounts
- chat-trace.md: one chat turn end to end, which code owns each step, and what is deprecated (EMQX, MCP, possibly chat_router)
- sdk-components.md: the AI SDK and Chat SDK pieces (Chat, ChatTransport, message parts, stream chunks, web adapter, cards, charts) and how each maps to 3tched
- threetched-catalog.md: the 147 ZeroClaw-derived threetched methods available to call (SOPs, agents, cron, skills, memory, eval, estop), and which to avoid
- ui-surfaces.md: how a plugin schema declares a UI surface (UiSurface path, name, schema, purpose), where the Svelte chat interface is defined, and how to add one
- plugin-feeds.md: the per-plugin schema and state feed (Subscribe, StateChange format, generations, tombstones) and how it feeds the UI state
- backend-fuse-ui-feed.md: the full path from plugin source to UI (seal, MutationEngine, capture, mount, fuse.get_catalog), the schema vs state split, and what is live today
- two-chains.md: the private 3tched receipt chain compared with the public blockchain, and how anchoring ties them together
- privacy.md: PII and IP in the schema (x-opdbus-private, protection floors, OSCAL), and what may never reach the public record

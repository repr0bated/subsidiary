# Vercel AI SDK with Svelte

Topic: streaming chat, tool calls and model providers in SvelteKit.
Source: https://ai-sdk.dev/docs/getting-started/svelte
Retrieved: 2026-11-19

## Packages
`ai` (core) and `@ai-sdk/svelte` (bindings), plus `zod` for tool input schemas. Scaffold with `npx sv create`.

## Server side
A SvelteKit endpoint (`src/routes/api/chat/+server.ts`) receives `UIMessage[]`, converts them with `convertToModelMessages`, calls `streamText({ model, messages, tools, stopWhen })`, and returns a stream response. `stopWhen` with a step count lets the model call a tool, read the result and continue.

## Providers
The quickstart uses the Vercel AI Gateway (one key, many models). Any other provider can be swapped in by installing its package. Self-hosted or local models are possible through OpenAI-compatible providers. This matters for a no-network container.

## Client side
The `Chat` class holds `messages` and `sendMessage`. Each message has ordered `parts`: text, reasoning, and tool parts named `tool-{toolName}`. The UI decides how to render each part type. The SDK's prebuilt chat components are React only; Svelte chat UI is hand-built.

## Svelte-specific rules
Class arguments are not reactive unless passed by reference (use getters). Do not destructure class properties; it disconnects them. Synchronizing instances needs `createAIContext()` in a root layout.

## Tools
A tool has a description, a zod `inputSchema` and an `execute` function that runs on the server. The model decides when to call it. Tool results come back to the model and to the client as parts.

## For Subsidiary
- Tool parts give a natural place to show proposed actions. The "chatbot only renders" rule means tool `execute` must not perform effects itself; it should write a grant-checked FUSE call file or only return a proposal.
- The quickstart keeps the API key in `.env.local`. This project keeps secrets in env from `/etc/op-dbus/secrets`, never in files in the repo.
- If all models run behind FUSE, the SvelteKit endpoint and provider setup in this quickstart do not apply as written. Only the message and part model may be reusable.
- The quickstart's weather tool returns random numbers. It is a demo of the mechanism only.

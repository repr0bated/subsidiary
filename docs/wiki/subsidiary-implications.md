# Implications for Subsidiary

Topic: how the research affects the sealed-surface design.
Retrieved: 2026-11-19

## Two ways to render on the fly
1. Catalog + spec (json-render). Seal is structural. Vocabulary of primitives is fixed; every page is generated. Streams well. Smaller attack surface.
2. Generated Svelte compiled at runtime. Fully free-form. The seal must be built: AST allow-list, sandboxed iframe, strict CSP, one message channel to the host.

A hybrid is possible: json-render for most views, and sandboxed generated Svelte only for views the catalog cannot express.

## Fixed rules that apply to either
- The chatbot only renders; it never executes.
- All actions go through grant-checked FUSE call files.
- Schema is read live through FUSE; no copy.
- Only hashes go on-chain.
- Secrets come from env, never from repo files or prompts.

## Settled
- The browser reaches the backend only through FUSE call files, so there is no separate HTTP path to resolve. Where the process that serves the UI sits relative to the mount is a deployment detail, not a rule conflict. VERIFY when the container exists.
- All models run in the backend behind FUSE. The UI sends a request and gets schema back. The AI SDK's server endpoint and provider setup are therefore not used as designed; at most its message and part types are reusable on the client.

## Open questions (owner decides)
1. Catalog vocabulary, free-form compile, or hybrid?
2. What the backend returns to the UI per request: a json-render style spec, Svelte source, or only schema that the chatbot then turns into a view.
3. Can the catalog be generated from the live schema at runtime? VERIFY in json-render.
4. How catalog action names map to grant-checked call files.

## Not needed
Chat SDK (multi-platform bots) is out of scope for the GUI.

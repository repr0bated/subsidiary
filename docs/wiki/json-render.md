# json-render

Topic: generative UI constrained to a component catalog.
Sources: https://github.com/vercel-labs/json-render (README, Apache-2.0); Svelte skill: https://skillsmp.com/skills/vercel-labs-json-render-skills-svelte-skill-md
Retrieved: 2026-11-19

## Idea
The model does not write UI code. You define a catalog: component names, a zod schema for each component's props, a description, and a list of named actions. The model returns a JSON spec that may only reference catalog entries. A renderer turns the spec into live UI.

## Flow
User prompt -> model prompted with the catalog -> JSON spec -> renderer. `catalog.prompt()` builds the system prompt from the catalog (component descriptions, prop schemas, actions).

## Spec shape
A flat tree: a `root` key plus an `elements` map. Each element has `type`, `props`, `children` (ids). Optional `visible` conditions and `watch` blocks sit beside them.

## Dynamic values
Any prop can be an expression: `$state` (read a state path), `$cond/$then/$else`, `$template` (string interpolation from state), `$computed` (call a registered function), `$bindState` (two-way binding). Built-in action `setState` updates the state model, which re-evaluates visibility and expressions. `watch` fires an action when a state path changes (not on first render).

## Streaming
SpecStream: `createSpecStreamCompiler` accepts chunks and yields a partial spec so the UI renders progressively.

## Svelte
Packages: `@json-render/core` and `@json-render/svelte` (Svelte 5, runes). `defineRegistry(catalog, { components })` maps catalog names to Svelte implementations; `<Renderer spec registry />` renders. Components receive `props`, `children`, and `emit`. `@json-render/shadcn-svelte` ships 36 prebuilt components. `@json-render/devtools-svelte` gives an inspector (spec tree, state editor, action log, stream log).

## Other packages worth knowing
`@json-render/mcp` (MCP apps integration), `@json-render/yaml` (YAML wire format with a streaming parser), `@json-render/directives` (format, math, concat, i18n helpers), `@json-render/chat` (render specs as Slack/Teams/Discord cards).

## For Subsidiary
- Catalog-only rendering: output outside the catalog cannot render, so no sandbox is needed to stop arbitrary code. This is a json-render constraint, not the seal. The seal (owner, 2026-11-23) is the sealed scaffolding and functional core elements in the blobs: the chat interface, the model and mode picker, the shell.
- Pages are still generated per view; only the vocabulary of primitives is fixed. The project owner must decide whether a fixed vocabulary counts as "nothing static".
- Catalog actions are names. They must be wired to grant-checked FUSE call files, never to direct HTTP. VERIFY how action handlers are registered in the Svelte renderer.
- The catalog can be generated from the live schema, so schema changes change what the chatbot can offer without code changes. VERIFY feasibility of building a catalog at runtime.

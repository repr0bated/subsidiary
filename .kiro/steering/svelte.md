---
inclusion: fileMatch
fileMatchPattern: "ui/**/*.svelte"
---

# Svelte sealed-surface guide

- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`). No legacy `export let` or stores for new code.
- Svelte only. No React, Vue, Angular, Solid or any other UI framework: no `react`, `@ai-sdk/react`, `@ai-sdk/vue`, `@ai-sdk/angular`, JSX, or their component libraries. Use `@ai-sdk/svelte`, `ai`, `chat`, and `@json-render/svelte`; translate React examples to Svelte.
- TypeScript in components (`<script lang="ts">`).
- The surface is sealed: components never fetch directly. All backend calls go through the FUSE call-file client module.
- The chatbot is the canvas: it renders each view on the fly. It only renders; execution requires a grant-checked call.
- Run `npm --prefix ui run check` after edits.

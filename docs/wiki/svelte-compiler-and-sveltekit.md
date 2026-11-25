# Svelte compiler and SvelteKit

Topic: compiling Svelte at runtime, and what SvelteKit adds.
Sources: https://svelte.dev/docs/svelte/svelte-compiler ; https://svelte.dev/docs/kit/introduction
Retrieved: 2026-11-19

## Svelte compiler (`svelte/compiler`)
- `compile(source, options)` turns `.svelte` source into a JavaScript module that exports a component, plus CSS, warnings and metadata.
- `parse(source, { modern: true })` returns the abstract syntax tree without compiling. Node types include Component, RegularElement, ExpressionTag, HtmlTag (`{@html}`), RenderTag, Script, and directives such as `on:`, `bind:`, `use:`. This allows static checks before compiling.
- `compileModule` compiles JS containing runes. `preprocess` transforms source (for example styles). `print` converts an AST back to source.
- Useful options: `css: 'injected'` or `'external'`; `runes` to force runes mode; `fragments: 'tree'` for sites whose Content Security Policy requires trusted types (the default `'html'` strategy does not work there); `generate` client or server; `warningFilter`.
- Compile errors are returned as errors the caller can catch and feed back to a model.

## What compiled output can do
The result is ordinary JavaScript. The compiler does not restrict what a component may call (network, DOM, globals). Any seal around generated Svelte must come from outside the compiler: AST checks before compiling, a sandboxed iframe, and a strict Content Security Policy.

## SvelteKit
A framework on top of Svelte: file-based routing, server endpoints, SSR, client rendering or prerendering, preloading, built on Vite with hot reload. Svelte alone renders components; SvelteKit supplies the app around them.

## For Subsidiary
- Runtime compile is a real option for free-form views, with the cost of building the seal yourself.
- SvelteKit is optional. A plain Vite + Svelte 5 app avoids a server layer; SvelteKit gives server endpoints that could hold the FUSE client and the model call.
- If a CSP with trusted types is used for sealing, set `fragments: 'tree'`.

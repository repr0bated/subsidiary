# Requirements: Chat Canvas UI

## Introduction
The UI is the chatbot: the identity's display window, and nothing is exposed to the human until the chatbot renders it. It runs in the container and is passed through to the user's browser. The chatbot is the canvas: a fixed chat shell plus whatever views the user asks for, rendered from the schema the identity is granted. The backend stays in 3tched (`odbus-verified`). The UI only sets the chat mode and model, reads the granted schema from its FUSE mount, and makes every call through call files. The host decides all grants and capabilities.

This UI is built in this repository first and will move to its own repository later. It must stay mergeable into 3tched.

Backend contracts this spec relies on, not copied here (single source): `odbus-verified/.kiro/specs/identity-chat-interface` (chat turns, identity, exchange point Requirement 34), the sealed `chat_response`, `project`, `json_render`, `schema_renderer` and `identity_sled` plugins, and the execution tracker. Design notes: `docs/design-embodiment.md`, `docs/wiki/chat-trace.md`, `docs/wiki/sdk-components.md`, `docs/wiki/exchange-point-and-schema-feed.md`.

## Prerequisite
Working plugin state is required before the UI can be built or demonstrated: without committed state in the feeds, every view shows inaccurate data. The owner is fixing and verifying state separately (checklist in `docs/wiki/plugin-feeds.md`, "What the UI depends on"). Until it passes, UI work is limited to the shell, the transport and rendering from schema frames; no view may present data as accurate.

## Glossary
- **Shell**: the fixed parts of the UI: chat, model and chat-mode picker, navigation menu.
- **Seal**: the scaffolding and functional core elements sealed in the blobs (the shell and its surfaces). The catalog is a separate constraint: it limits what can be drawn.
- **Canvas**: the rest of the browser window, where views are rendered.
- **Catalog**: everything `fuse.get_catalog` returns: every plugin's sealed schema and operations, each flagged `currently_granted`.
- **Runnable**: an operation with `currently_granted` true.
- **Catalog**: the components sealed in the `json_render` blob.
- **Candidate**: a component created at runtime and registered for review.

## Requirements

### Requirement 1: First person
**User story:** As the identity, I want to act from my own mount, so that everything I may use is already present.
1. THE UI SHALL read what it may use from the identity's own mount and SHALL NOT discover endpoints, look up services, poll, wait for readiness, or run login or token flows.
2. THE UI SHALL take the identity from `identity_sled.get_own_identity` on its own mount.
3. THE UI SHALL make every call as the human through the door's `CallMethod`, admitted by `Runtime::call` (the same tracker path as a call file), and SHALL show the receipt it returns. Identities inside containers make their calls by writing call files.
4. THE UI SHALL take state changes from the plugin feeds, not from polling.

### Requirement 2: Rendered by the chatbot, present but not runnable
**User story:** As a user, I want the chatbot to show me the system accurately, including what I cannot run, and let me run only what I am granted.
1. THE UI is the chatbot. Nothing from the catalog (`fuse.get_catalog`) SHALL reach the human until the chatbot renders it.
2. WHEN the chatbot renders an operation whose `currently_granted` is false, it SHALL show it as present but not runnable.
3. THE chatbot SHALL NOT offer a control that runs an operation that is not runnable. The host still refuses such a call in `Runtime::call` if one is made.
4. THE chatbot SHALL never render capabilities: no capability names, identifiers, grant lists or `required_capability` values, in any view, refusal or receipt.
5. WHEN a user asks for something that is not in the catalog at all, THE chatbot SHALL reply that there is nothing like that available and SHALL NOT render a new view. No "not found", 404 or placeholder views.
6. THE chatbot SHALL NOT make or change grants or capabilities.
7. WHEN grants change, THE chatbot SHALL take the new runnable state from the next catalog load.
8. THE chatbot SHALL render whatever schema the host delivers. The host decides what this container may see; if a schema is present, it may be rendered, and the UI SHALL NOT filter it further. Parts that cannot be run still help make up the whole view and render as not runnable. (Owner, 2026-11-25.)

### Requirement 3: Shell
**User story:** As a user, I want a chat and a model and mode picker that are always there but can get out of the way.
1. THE UI SHALL provide a shell with the chat, the model and chat-mode picker, and a navigation menu.
2. THE shell's chat and picker SHALL be defined as UI surfaces in the sealed blob schema, not hand-built per business.
3. WHEN the user collapses the chat, the picker or the menu, THE UI SHALL give the freed space to the canvas, so the whole window can be used for rendering.
4. THE default layout SHALL be part of the seal: declared in the blob schema with the shell's surfaces, not hard-coded in the UI.
5. THE UI SHALL start from the sealed default layout, let the user change it, and restore the user's layout on the next visit.
6. THE UI SHALL save and read the user's layout through a granted call, not with browser storage as the source of truth.

### Requirement 3a: Surfaces as a pre-catalog
1. THE UI SHALL take the list of interfaces it offers from the sealed UI surfaces (`chat_router.ListUiSurfaces`), each with its path, name, schema and purpose.
2. THE UI SHALL fulfil a surface's purpose with components from the `json_render` catalog.
3. WHEN a surface has a purpose the renderer does not understand, THE UI SHALL leave that surface out and keep everything else working.
4. THE UI SHALL NOT invent surfaces that are not sealed.

### Requirement 4: Mode and model
**User story:** As a user, I want to choose the chat mode and model, and have the host apply them.
1. WHEN the user picks a chat mode, THE UI SHALL set it with `project.select_context`.
2. WHEN the user picks a model, THE UI SHALL set it with `chat_router.SetSelection`, offering providers and models from `chat_router.ListProviders` and `ListModels`. The model picker SHALL render from the sealed Routable Models surface.
3. THE picker SHALL offer only modes and models returned by granted reads.
4. WHEN the identity is a subsidiary, THE picker SHALL NOT offer Personal mode.

### Requirement 5: Chat turns
**User story:** As a user, I want to talk to the business and see what it does.
1. THE UI SHALL use the `@ai-sdk/svelte` `Chat` class with one transport that submits turns through `chat_response.submit_turn` and turns the committed response into message parts.
2. THE UI SHALL render the response from its `respond_to_user`, `request_clarification` or `cannot_perform` tool call, including any canvas content.
3. WHEN the responder proposes a mutation, THE UI SHALL ask the user to approve or deny it, and SHALL send the answer with `approve_pending_tool`. (Future, not implemented: a two-person rule, which a client may opt out of. Not required for the hackathon UI.)
4. WHEN a call completes, THE UI SHALL show its receipt.
5. IF the host refuses a call, THEN THE chatbot SHALL show that it was refused, without naming any capability.

### Requirement 6: Canvas rendering
**User story:** As a user, I want to ask for any view, such as a graph of the most used contracts or an agent control panel, and see it rendered.
1. WHEN the user asks for a view, THE chatbot SHALL build it from catalog components and granted data.
2. THE UI SHALL validate every spec with `json_render.validate_spec` before showing it.
3. THE UI SHALL render every visible element, including the shell, from the catalog.
4. json-render renders only catalog items. THE UI SHALL NOT render anything outside the catalog by any other means; a component the catalog lacks enters only as a candidate (Requirement 7).

5. WHEN a response carries a view, THE transport SHALL emit it as AI SDK `data-spec` parts (`patch` while streaming, `flat` for a committed spec), and THE UI SHALL rebuild it with `buildSpecFromParts` from the reactive `Chat` messages, so the view renders while it is being written.
6. THE UI SHALL NOT use json-render's HTTP helpers (`createUIStream`, `createChatUI`); specs reach the renderer only through the FUSE transport.

### Requirement 6a: Actions
1. THE UI SHALL register an action handler (`defineRegistry` `actions`) only for catalog actions whose method is granted.
2. Each action handler SHALL write one call file for its method and return the receipt; it SHALL NOT perform any other effect.
3. WHEN an action has `mutates_state`, THE UI SHALL route it through the responder's propose and approve flow (Requirement 5.3).
4. THE UI SHALL keep `JsonUIProvider` state as local view state only and SHALL NOT treat it as committed state.

### Requirement 6b: One feed per plugin
1. THE UI SHALL keep one feed per plugin, built from `StateSync.Subscribe` (subscribe first, then hydration and live frames), and SHALL take schema from `fuse.get_catalog`.
2. THE UI SHALL take each plugin's schema from its schema frame and SHALL NOT keep another copy.
3. THE UI SHALL apply state frames by object path, keep only the newest `state_generation` per path, honour tombstones, and ignore older frames.
4. THE UI SHALL expose feed data read-only under `/plugins/<plugin_id>` in the json-render state, so views bound to it update when the feed changes.
5. THE UI SHALL NOT write into feed data; state changes only through sealed method calls and come back through the feed.
6. WHEN state is withheld, THE UI SHALL treat it as not there.
7. THE UI SHALL stop a feed on identity change, capability denial, revocation or a malformed frame, and retry only on transport unavailability or an expired proof.

### Requirement 6c: Accountability view
**User story:** As a user, I want to find an event and question the chatbot about its own receipts.
1. WHEN the user searches in Accountability mode, THE UI SHALL show matching events from the identity's record, each with its receipt hash and whether its chain head is anchored.
2. WHEN the user questions the chatbot about an event, THE chatbot SHALL answer only from its own receipts and committed state, and SHALL cite the receipt each answer rests on.
3. IF there is no receipt for something asked, THEN THE chatbot SHALL say it has no record of it.
3a. THE chatbot SHALL answer who, what, where, when, who authorized, and why it went wrong from the receipt's actor, method and subid, object path, timestamp and chain event, approval, and outcome. It SHALL NOT render capability names or grants.
3b. WHEN asked why it made a decision, THE chatbot SHALL answer only from the rationale recorded at the time (turn, tool proposal, recorded reasoning, persona pieces) and SHALL NOT construct a new explanation after the fact.
4. THE UI SHALL let the user check any cited receipt against the public record.

### Requirement 7: Missing components
**User story:** As a user, I want a view even when the catalog lacks a component it needs.
1. WHEN a view needs a component the catalog lacks, and the identity holds `json_render.gallery`, THE chatbot SHALL create the component, register it with `json_render.save_candidate`, and use it.
2. THE UI SHALL mark every candidate as new and in review until it is promoted.
3. THE UI SHALL NOT promote candidates; promotion is a separate capability held by the reviewer.
4. THE UI SHALL run unpromoted candidates isolated from the rest of the page.
5. A candidate SHALL NOT reach data the identity is not granted.

### Requirement 8: Look and feel
**User story:** As a viewer, I want the identity to feel like someone at work.
1. THE UI SHALL use a Lichtenstein pop-art style (Ben-Day dots, thick black outlines, flat red, yellow and blue, speech balloons) drawn for this project, with no copied artworks and no third-party characters, logos or lettering.
2. THE UI SHALL show a sound-effect burst only for a real backend event: call written (ZAP!), receipt returned (KA-CHUNK!), contract accepted (CHING!), head anchored (POW!), receipt verified (BAM!), candidate registered (ZING!), host refusal (BONK!).
3. THE UI SHALL honour reduced-motion settings and give every burst a text equivalent for screen readers.

### Requirement 9: Stack and portability
1. THE UI SHALL use Svelte 5 only, with `@ai-sdk/svelte`, `ai`, `@json-render/svelte` and, where useful, `chat`. It SHALL NOT use React, Vue, Angular or any other UI framework.
1a. THE UI SHALL pin `@ai-sdk/svelte` ^5, `ai` ^7, `@json-render/core` and `@json-render/svelte` at the host blob's `core_version` (0.20.x today), `zod` ^4, and Svelte 5.31 or newer, and SHALL build with Node 22 or newer. It SHALL NOT configure `@ai-sdk/gateway` or any provider package; inference runs on the host.
2. THE UI SHALL be a static build served by the bridge's `container_ui.rs` on the TLS door. THE browser SHALL reach the backend only through the door: `fuse.get_catalog` for schema, `StateSync.Subscribe` for state, and `CallMethod` for actions. THE UI SHALL add no server or adapter of its own.
3. THE UI SHALL NOT hard-code paths or names of this repository, so it can move to its own repository.
4. THE UI SHALL use only current backend pieces as listed in `.kiro/steering/current-vs-deprecated.md`.

### Requirement 10: Carried over from identity-chat-interface
These apply as written in `odbus-verified/.kiro/specs/identity-chat-interface/requirements.md`; they are referenced, not copied.
1. THE UI SHALL bind to whichever sealed identity it runs as and hard-code no Branch (old Requirements 4, 19, 20).
2. THE UI SHALL handle no credentials (old Requirement 5).
3. THE UI SHALL display committed state as the authority, not request payloads or model text (old Requirement 11).
4. THE UI SHALL treat model output, tool results and receipts as untrusted content (old Requirement 14).
5. THE UI SHALL meet the old accessibility requirement (old Requirement 16).
6. THE UI SHALL take plugin feeds as carrying no authority (old Requirements 23 to 27).

### Reference map to identity-chat-interface
| Old requirement | Here |
|---|---|
| 1 Discovery before reliance | Replaced by Requirement 1 (first person): read the mount, do not discover |
| 2, 3 Fresh Svelte interface, SDK pinning | Requirement 9 |
| 6 Capability-derived tool registry | Retired upstream; not used |
| 7 Grant immutability and denial handling | Requirements 2 and 5.5 |
| 8, 9 Tool-call validation, mutation confirmation | Requirement 5 |
| 10 Tracker linkage and chain verification | Requirement 5.4; anchoring is in `receipt-anchoring` |
| 12 Model and provider decisions | Requirement 4 |
| 13 Transport and route placement | Requirement 9.2 |
| 15 Error states | Requirement 2 (no error views for ungranted) and 5.5 (host refusals) |
| 21, 22 Legacy chat removal, control-plane identity | Backend; not in this spec |
| 28 Server-side credential check of feed messages | Backend |
| 29 EMQX | Retired; not used |
| 30, 31 FUSE file I/O, FUSE-first | Requirements 1.3 and 9.2 (FUSE only) |
| 32 SDK over gRPC-Web | gRPC-Web is used only between the browser and the in-container adapter; the adapter turns every RPC into one call file and returns its receipt |
| 33 Generated UI elements at runtime | Requirements 6 and 7 |
| 34 Exchange point and chat modes | Requirement 4 |

## Open questions
1. Model selection (resolved: `chat_router` is current; the name stays). The existing 3tched.com picker uses `chat_router.ListProviders`, `ListModels` and `SetSelection`. Confirm `chat_router` is current. Its client code names the capability `cap.software.tched-router.selection.set@v1`, but the sealed method requires `cap.software.threetched.selection.set@v1`, so that client is stale: the picker predates the separation of threetched (owner, 2026-11-23). Use it as reference only.
2. UI surfaces in the blobs (2026-11-23): only `chat_router.ui_surfaces` declares any: Chat (`/chat`, schema `chat_router.chat`), Routable Models (`/models`, schema `chat_router.providers`, the model picker) and gRPC Diagnostics. There is no surface for the chat-mode picker; the 3tched.com `ModeStrip` calls `project.get_context` and `project.select_context` directly. A mode-picker surface would need adding to a plugin schema in the backend.
3. Which granted method stores the user's layout.
4. Where candidates are compiled, and how they are isolated in the browser.
5. What the navigation menu lists: earlier views, the business's offerings, or both.
6. How the chatbot learns a turn is pending now that EMQX is retired.

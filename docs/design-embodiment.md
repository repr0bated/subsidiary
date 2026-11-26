# Design: identity embodiment

Owner direction, 2026-11-23. Draft for the UI, the video and the write-up.

## Idea
The identity is the business, and it should feel like someone. 3tched already maps its components to a body (below). Subsidiary keeps that anatomy and shows the body acting: talking, offering, closing the deal, doing the work and proving it. The look is 1960s comic pop art: Ben-Day dots, thick black outlines, flat primary colors (red, yellow, blue) on white, speech balloons and narration boxes, and sound-effect bursts when something happens.

## The accountability view: the chatbot on the stand (owner, 2026-11-23)
Search an event by meaning, then put the chatbot on the stand and question it about its own receipts. It runs in the existing Accountability chat mode.
1. The user searches our record semantically ("the audit you did for the library last week").
2. The matching events and receipts appear, each with its hash and whether its chain head is anchored.
3. The user cross-examines the chatbot: "Why did you call this method?", "What did the receipt say?", "Show me the next step."
4. The chatbot can answer only from its own receipts and committed state. Every answer cites the receipt it rests on, and the user can check that receipt against the public record.
5. If there is no receipt for a claim, the chatbot says so. It cannot testify to anything it has no record of.
The questions on the stand, and what answers each:
| Question | Answered from |
|---|---|
| Who? | The receipt's actor: `executor_principal_id` and session, from the verified caller |
| What? | The method called (`<plugin>.<method>`), its subid, and the hashes of its arguments and result |
| Where? | The plugin and D-Bus object path, and which identity's mount it ran from |
| When? | The receipt's timestamp and chain event id, and the anchored head that covers it |
| Who authorized it? | That it was admitted, and for mutations who approved it (`approve_pending_tool`). Capabilities are never rendered |
| Why did it go bad? | The receipt's outcome (`DomainFailed`, `NeedsReview`, a refusal) and the recorded error |
| Why did you make that decision? | Only what was recorded at the time: the turn, the tool proposal, the reasoning parts kept with the generation, and for persona agents the persona pieces used. The chatbot must not invent a reason after the fact; if no rationale was recorded, it says so |

What comes out of the stand goes back as learning: the findings from questioning (what went wrong, which decision was weak) return to the operations control-plane chatbot as experience. That chatbot has no execution rights and no internet access; it can only delegate and suggest. Intended production design, not implemented yet (owner, 2026-11-23): execution is done by other agents approved by two humans (a two-person rule), each under its own grants and receipts. A client may opt out and have the chatbot execute with no approval, if that is what they want; the opt-out itself should be on the record, so "who authorized it?" can answer "the client chose no approval". So the control-plane chatbot learns from the record and suggests better next time, but it cannot act on its own; acting takes an agent that two people approved. Both approvals are on the record, and "who authorized it?" names both.

Courtroom fits the comic style: the witness stand, "OBJECTION!", a gavel (BANG!) when a receipt checks out.

## Persona: the used car salesman (owner, 2026-11-23)
The identity sells itself, so give it the voice of a classic used car salesman: fast-talking, friendly, a little over the top. "Step right up!", "Have I got a deal for you!", "They don't make 'em like this anymore!", a wink, a handshake to close.

The catchphrase is first person: "I've got everything you need right here, no need to go searching!" It is the salesman's line and the identity's design at once. Everything the identity may use is already in its own mount: no searching, no polling, no logging in somewhere else. The salesman says it as patter; the system means it literally.

The whole deal, all on the lot: "Got the notary, the documents, the pen, the deliverable and the receipt, right here!" Each one is a real piece:
| Salesman's line | What it really is |
|---|---|
| The documents | The terms document, kept off-chain; its hash goes in the hire (`termsHash`) |
| The pen | The party's key signing the transaction: create, accept, confirm |
| The notary | `EtchedAnchor`: the public, timestamped anchor of the receipt chain head |
| The deliverable | The work itself, for example the CMS or the agent's audit |
| The invoice and receipt | 3tched's receipts for the work, and the hire's on-chain record (`HireCompleted` with the terms hash and the anchored work head) |
| The warranty | A warranty period on the hire: claims and remedies are public, anchored, and counted per provider |
Note: "invoice" is the record of what was delivered. The hire contract records delivery, not payment (owner, 2026-11-23).

Warranty line: "And it comes with a warranty, friend, a real one. It's on the record!" Any claim the visitor files, and the fix, are on-chain for anyone to see.

The twist is the point of the project: everyone expects a used car salesman to bend the truth, and this one can't. Every claim it makes is backed by its own receipts, and every deal it closes is on-chain. "Don't take my word for it, check the receipt!" The comedy of the stereotype makes the accountability land.

Rules for the persona:
- It pitches only what is runnable for this visitor. It may show what is on the lot but not available to them, clearly marked. No promises it cannot keep, no invented features, no fake prices.
- No pressure tactics that misrepresent anything: no fake scarcity or fake deadlines. The salesman patter is style, not deception.
- It leans on "it's all right here": it offers what is on its lot (the catalog, runnable items first) and never sends the visitor off to look elsewhere.
- When asked for something it does not have, it stays in character and is honest: "Sorry, friend, nothing like that on the lot today."
- It points to proof: after the hire it offers the receipt and the anchored hash, and invites the visitor to check them.
- The persona is defined in the backend (the `persona` plugin), not hard-coded in the UI, so it travels with the identity.
- It fits the comic panels: speech balloons for the pitch, CHING! when the deal closes.

## Existing 3tched vocabulary (pre-existing)
Source: https://www.3tched.com/kit/assets/3tched-architecture-embodied.webp, "An identity, embodied. One body. Connected by design." The iContainer is the body, the embodiment of an identity. Use these names so Subsidiary matches 3tched.

| Part | Component | Role |
|---|---|---|
| Brain | Chatbot | Reasons and plans |
| Eyes | Evidence and visibility | Visibility that enables accountability |
| Lungs | Shared application access point | Controlled exchange in and out (Unix socket to D-Bus operations) |
| Heart | Governed execution | Turns permitted intent into action (core execution runtime) |
| Spinal cord | FUSE filesystem | The body's access pathway |
| Skeleton | Schema | Structure and constraints (typed schema, declared components, interface) |
| Hands and feet | End user | Human agency and interaction |

Flow: Identity (who is acting?) → Authority (what may they do?) → Policy (what rules apply?) → State (what changed?) → Evidence (what proves it?). Request → authorization → execution → state change → evidence.

Companion diagram, "One system. Connected by design." (https://www.3tched.com/kit/assets/3tched-architecture-regular.webp), shows the same flow without the body, plus:
- Retained context: evidence feeds back into policy, so what the identity did shapes what it may do next.
- 01 Shared lungs: one shared application socket; identity and permissions checked before execution (Unix socket to D-Bus operations).
- 02 Coordination and continuity: task planning → agent execution → tool coordination → state and context store. Models selected for the task, authorized agents execute, decisions and context retained.
- 03 Generated interfaces: typed schema → declared components → generated interface, on Svelte/SvelteKit, Vite and json-render. This is the UI path Subsidiary uses.
- Controlled transport: ingress to the application door; intended egress through a private Xray socket to the REALITY gateway.

Video order: the regular diagram (the system), then the embodied one (the system is a body), then the pop-art panels (the body at work as a business).

The diagrams are pre-existing 3tched material; list it in `PREEXISTING.md` if it or its wording is reused.

## What Subsidiary adds: the business in action
The diagram shows the anatomy. Subsidiary shows the same body at work as a business closing a deal, drawn as pop-art panels. Each panel is one step of the flow, told by what the business does:

| Panel | Part at work | What the visitor sees |
|---|---|---|
| "I can help with that." | Brain, through the chat | The business pitches its own service in a speech balloon |
| "Here's what I can offer." | Skeleton and spinal cord | Its granted methods, rendered from schema |
| "Let's shake on it." | Hands and feet (the visitor) and the hire contract | The visitor hires it; the deal closes |
| "On it!" | Heart | Governed execution of the work |
| "Here's your receipt." | Eyes | Evidence of what was done |
| "It's on the record." | Eyes, anchored on-chain | The chain head anchored on anvil |
| "Check it yourself." | The visitor | Receipt verified against the anchor |
| "Can't do that one." | Authority | Only when the host refuses an actual call (for example a grant changed after the view was rendered) (no capability named) |

## The UI is a display window, defined by the user
There are no fixed screens. The user says what they want to see, and the chatbot renders that view in the chat. Examples: "render a view showing a graph of the most used contracts", or "render an agent control panel" (the agents it may run, their status, and start and stop controls).

How a request like that is satisfied:
1. The chatbot works from the catalog `fuse.get_catalog` returns: every plugin and operation, each flagged `currently_granted`. Ungranted operations are shown present but not runnable (owner decision, 2026-11-24); private data the human may not see is never in it.
2. From that schema it picks catalog components (for example a chart and a table) and builds a spec. The data comes from granted read operations, through call files.
3. The spec is validated against the catalog before it is shown.
4. What is not in the catalog at all is not there. The chatbot just says, in the conversation, that there is nothing like that available, and renders no new view. No 404, no error view, no placeholder.

So "user-defined" means the user chooses the view; the catalog bounds what can be drawn and shown, and the user's grants decide what is runnable. The catalog bounds what can be drawn; the grants bound what can be shown.

Open for the "most used contracts" example:
- Is there a chart component in the sealed catalog today? (`json_render.list_components`)
- Which granted read operation returns contract usage? Chain events are on anvil, and the UI reaches nothing except through FUSE, so a sealed method has to provide them. Candidates: receipts or chain events the backend already indexes.

For the agent control panel example: no agent control panel exists anywhere, and none is built ahead of time. When the user asks, the chatbot composes one from catalog components and the agent-related methods the identity's mount shows (today `agent_config`: `get_config`, `list_tools`, `register_tool`, `update_config`, `reset_config`; and `workflows`). Each control is bound to one of those granted methods. Ungranted controls are shown as present but not runnable (owner decision, 2026-11-24), so the panel is accurate; they cannot be used. Capabilities are never rendered. Methods the user is not granted appear in the panel as present but not runnable. Only if no agent methods exist in the catalog at all does the chatbot say "Sorry, there's nothing like that available". A user with different grants gets the same panel with different controls runnable.

## Layout (owner, 2026-11-23)
The chatbot is the canvas, inside a structure the user can rearrange.
- Fixed parts, sealed in the blobs: the chat interface (Svelte with the Vercel AI SDK and Chat SDK) and the model and chat-mode picker. They are defined as UI surfaces in the blob schema, not hand-built per business. Everything else on screen is rendered by the chatbot.
- Shell: the navigation menu, the chat, and the model and chat-mode picker. Views render inside the shell, not in place of it.
- Default: there is a default initial layout, sealed in the blob schema with the shell's surfaces (part of the scaffolding). The user can change it (arrangement, what is open or collapsed), and the change is remembered for their next visit.
- Collapsible: the navigation menu, the chat, and the model and chat-mode controls can each collapse, so the whole browser window is available for the rendered view.
- Canvas: the rest of the window, where the chatbot renders the view the user asked for.
- The backend already has the UI surface type: `chat_router.ListUiSurfaces` (read, `cap.software.threetched.ui-surfaces.read@v1`) returns `UiSurface` records with `name`, `path`, `purpose` and `schema`. The `purpose` names the stack the renderer draws (Vite, SvelteKit, json-render, the Vercel AI SDK and Chat SDK); Antigravity's chat interface is the existing pattern. The chat and the picker are surfaces of this kind.
- `chat_router` is current (confirmed 2026-11-23); its name stays, though it is really the provider plugin.
- The pattern we follow (owner, 2026-11-23): the chat interface is declared as data in the sealed `chat_router` schema, in its `ui_surfaces` field. Each surface is `name`, `path`, `purpose`, `schema`. The sealed defaults today:
  | name | path | purpose | schema |
  |---|---|---|---|
  | Chat | `/chat` | vite, svelte-kit, json-render, ai-sdk, chat-sdk | `chat_router.chat` |
  | Routable Models | `/models` | vite, svelte-kit, json-render, ai-sdk, chat-sdk | `chat_router.providers` |
  | gRPC Diagnostics | `/grpc` | (none) | `plugin-service` |
  The `antigravity` and `antigravity_chat` plugins define no UI themselves; they are providers whose model catalog is delegated to `chat_router`, and the Chat surface above is the one that renders them. So the surface is the plugin's own schema plus a declared purpose, not a separate UI definition.
- Subsidiary's fixed parts use the same pattern: Chat and Routable Models (the model picker) as they are. The chat-mode picker has no surface yet; it would be a new `ui_surfaces` entry pointing at the `project` context schema. That is a change to the plugin source in the backend and a reseal, not something defined in this repo.
- Model and mode are set through `chat_router.SetSelection` and `project.select_context`; the picker's options come from granted reads such as `chat_router.ListModels` and `ListProviders`.

Remembering the layout: it is the user's own state, so it is saved and read back through a granted call, like any other state, never in browser storage as the source of truth. Open: which method holds it. Note on terms: in 3tched a "session" is the lifetime of the container or account and one bounded interaction is an "episode", so "next visit" here may be a new episode in the same session.

Open: what the navigation menu lists (views rendered earlier in the session, the business's offerings, or both) and where collapsed controls live (edge tabs, a toolbar).

## Missing component: make it, register it, use it (owner, 2026-11-23)
json-render can only render components in the approved catalog. When a view needs a component the catalog lacks, the chatbot creates it, registers it as a candidate, and uses it right away, flagged as new and in review. Review decides whether it gets a permanent place in the catalog.

The backend already has this flow in the sealed `json_render` plugin:
| Step | Method | Capability | Kind |
|---|---|---|---|
| Register the new element | `save_candidate` (`name`, `description`, `spec`, `svelte_source`, `compiled_output`, optional `cozo_relations`) | `json_render.gallery` | mutation |
| Check a spec | `validate_spec` | `json_render.read` | read |
| See candidates | `list_candidates`, `get_candidate` | `json_render.gallery` | read |
| Permanent place in the catalog | `promote_candidate` | `json_render.promote` | mutation |
| Drop it | `delete_candidate` | `json_render.gallery` | mutation |

Rules:
- This covers a missing component only. Methods absent from the catalog still get "Sorry, there's nothing like that available." Ungranted methods are shown present but not runnable. A new component cannot reach data the identity is not granted.
- Creating candidates needs `json_render.gallery`. Without it, the chatbot cannot create one and gives the same "nothing like that available" reply.
- Promotion is a separate capability, `json_render.promote`, held by the reviewer, not by the chatbot that made the candidate.
- A candidate is always shown with a visible "NEW, in review" flag until promoted.
- Each save and promotion is a call with a receipt, so every new component is on the record.

Open:
- `save_candidate` takes `svelte_source` and `compiled_output`, so a candidate is generated Svelte code. Where is it compiled, and how is unpromoted code isolated in the browser (sandboxed iframe, CSP, one message channel)? This replaces the earlier note in `docs/wiki/chat-as-canvas-route.md` that nothing compiles at runtime.
- Prefer composing the candidate from existing catalog primitives where possible, so less new code needs review.

## Sound effects (one per real event)
Each burst fires only on a real backend event, so the effects double as a readable audit of what happened.

| Event | Burst |
|---|---|
| Call file written | ZAP! |
| Receipt returned | KA-CHUNK! |
| Contract accepted | CHING! |
| Head anchored on-chain | POW! |
| Receipt verified | BAM! |
| New component registered for review | ZING! |
| Host refused an actual call | BONK! |

## Rules
- Generic pop-art style, our own drawings and text. The style is free to use; any artist's specific works are not. Do not copy or trace a painting or quote its text, do not use an artist's name as branding, and use no comic publisher's characters, logos or lettering. The rules forbid third-party trademarks and copyrighted material in the video without permission.
- Palette: red, yellow, blue, black, white. Dots as an SVG or CSS pattern, so they stay crisp at any size.
- Bursts and panels are components in the sealed `json_render` catalog, like every other visible element. No ad-hoc DOM.
- A burst never fakes an event. No receipt, no KA-CHUNK.
- Respect reduced-motion settings and give every burst a text equivalent for screen readers.

## Open
- One look for every business, or a costume per business (cold-chain logistics, public library)?
- Hand-drawn assets or CSS and SVG only?

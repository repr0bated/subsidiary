# Requirements Document

## Introduction

The sealed-surface GUI is the Subsidiary's user interface: a Svelte 5 +
json-render app that renders only what the acting identity's grants permit,
treats the chatbot as a display-only renderer, and dispatches every action
through a sealed method of the running 3tched backend, showing the receipt.

The GUI reads the **live** sealed schema (sealed catalog, per-method
`metadata.json`, `input.schema.json`, `output.schema.json`, and the
`json_render` component catalog) from the backend at runtime. It defines no
schema, grant or receipt format of its own.

In scope: the core loop screens (spawn subsidiary, issue grant, run action,
view receipt and its anchoring status), schema-driven forms and result views,
refusal and receipt components, chatbot rendering.

Out of scope: the backend admission logic, grants model, container
provisioning and FUSE/D-Bus code (pre-existing); on-chain anchoring itself
(spec `receipt-anchoring`).

## Requirements

### Requirement 1 — Live sealed schema

**User Story:** As the operator, I want the GUI to build itself from the
backend's live sealed schema, so that a newly sealed method appears without
new UI code and the GUI can never drift from what the backend enforces.

#### Acceptance Criteria

1. WHEN the GUI starts THEN THE SYSTEM SHALL load the method list and per-method schemas from the running backend for the acting identity.
2. WHEN a method's sealed schema changes in the backend THEN THE SYSTEM SHALL render the new schema after the next catalog refresh without a code change.
3. IF the backend's sealed schema cannot be read THEN THE SYSTEM SHALL show an unavailable state and SHALL NOT render any action controls.
4. THE SYSTEM SHALL NOT contain any bundled copy of a plugin schema, grant format or receipt format.

### Requirement 2 — Render only what grants permit

**User Story:** As the operator, I want the GUI to show only the actions the
identity is granted, so that the surface itself is a faithful picture of
authority.

#### Acceptance Criteria

1. WHEN the GUI renders the action list THEN THE SYSTEM SHALL include a method only if the identity's grants contain the method's exact required capability, or the method requires none.
2. IF a method is not granted THEN THE SYSTEM SHALL NOT request or render that method's input or output schema.
3. WHEN the identity's grants change THEN THE SYSTEM SHALL update the visible actions after the next grants refresh.
4. THE SYSTEM SHALL compare capabilities by exact string match only.

### Requirement 3 — Sealed dispatch for every action

**User Story:** As the operator, I want every button to go through a sealed
method, so that the UI cannot do anything the backend would not admit.

#### Acceptance Criteria

1. WHEN the user submits an action THEN THE SYSTEM SHALL validate the arguments against the method's live `input.schema.json` before dispatch.
2. WHEN arguments are valid THEN THE SYSTEM SHALL dispatch the call only through the backend's sealed method path (the identity's 3tchedFS call file, or the door's generic call method with the human's own credential).
3. IF arguments are invalid THEN THE SYSTEM SHALL show the validation errors and SHALL NOT dispatch.
4. THE SYSTEM SHALL NOT call any backend endpoint other than the sealed method path and read-only schema/grants/receipt reads.

### Requirement 4 — Receipts and refusals

**User Story:** As the operator, I want every action to end in a visible
receipt or a named refusal, so that I always know what happened and why.

#### Acceptance Criteria

1. WHEN a call completes THEN THE SYSTEM SHALL show the receipt returned by the backend (plugin, method, subid, required capability, side effect, result, operation id when present).
2. WHEN a call is refused THEN THE SYSTEM SHALL show the refusal including the missing capability when the backend names one.
3. IF the backend reports the outcome is unknown THEN THE SYSTEM SHALL show the operation id and SHALL NOT retry automatically.
4. WHEN a receipt has an anchoring record THEN THE SYSTEM SHALL show its anchoring status and a link to verify it.

### Requirement 5 — Chatbot as display-only renderer

**User Story:** As the operator, I want the chatbot to render generated UI
but never execute, so that conversation cannot bypass grants.

#### Acceptance Criteria

1. WHEN the chatbot produces a UI spec THEN THE SYSTEM SHALL validate it against the live `json_render` component catalog before rendering.
2. IF a generated spec references a component not in the catalog THEN THE SYSTEM SHALL reject the spec and show a rejection notice.
3. WHEN a rendered chatbot element triggers an action THEN THE SYSTEM SHALL route it through Requirement 3 exactly as a user-initiated action.
4. THE SYSTEM SHALL NOT allow the chatbot to dispatch a call without an explicit user submit.

### Requirement 6 — Core loop screens

**User Story:** As a judge, I want to walk the loop spawn → grant → action →
verify from the GUI, so that I can see the whole idea working.

#### Acceptance Criteria

1. WHERE the backend exposes a sealed method for spawning a subsidiary THE SYSTEM SHALL present it as the first step of the loop.
2. WHERE the backend exposes a sealed method for issuing a grant THE SYSTEM SHALL present it as the second step.
3. WHEN a loop step's method is not granted THEN THE SYSTEM SHALL show the step as locked with the missing capability.
4. WHEN an action's receipt is anchored THEN THE SYSTEM SHALL present the verify step with the on-chain reference.

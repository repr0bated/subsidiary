> Superseded on 2026-11-23 by `.kiro/specs/chat-canvas-ui`. Kept for reference only; do not implement.

# Requirements: Sealed Surface GUI

## Introduction
The chatbot is the canvas. Each view or page is rendered on the fly by the chatbot from the live schema, inside a sealed Svelte 5 surface. There are no predefined screens. The chatbot only renders; it never executes. All backend access goes through grant-gated FUSE call files.

## Requirements

### 1. On-the-fly rendering
**User story:** As a tenant user, I want each page generated for what I am doing, so the interface always matches the live schema.
1. WHEN the user navigates or asks for a view, THE SYSTEM SHALL have the chatbot render that view from the live schema.
2. WHEN the live schema changes, THE SYSTEM SHALL render the next view from the changed schema without a code change to the surface.
3. THE SYSTEM SHALL NOT ship predefined per-business screens.

### 2. Sealing
1. THE SYSTEM SHALL render chatbot output only inside the sealed surface.
2. IF chatbot output cannot be rendered inside the seal, THEN THE SYSTEM SHALL reject it and show the reason.
3. THE SYSTEM SHALL NOT let rendered output issue direct HTTP or database requests.

### 3. Render only
1. THE SYSTEM SHALL NOT execute any action from within the chatbot.
2. WHEN a rendered view offers an action, THE SYSTEM SHALL carry it out only through a grant-checked FUSE call file.

### 4. Backend access
1. WHEN the surface needs data, THE SYSTEM SHALL read it through a FUSE call file.
2. THE SYSTEM SHALL read the schema through FUSE and SHALL NOT keep a copy.

### 5. Admission
1. WHEN an action is requested, THE SYSTEM SHALL admit it only if identity, grants, and sealed checks all pass.
2. IF any check fails, THEN THE SYSTEM SHALL reject the action and show which check failed.

## Open questions
- What the chatbot emits per view (a structured description the surface interprets, or generated Svelte that is sealed before running).
- How the seal is enforced for that output.

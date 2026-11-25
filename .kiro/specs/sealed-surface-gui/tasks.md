> Superseded on 2026-11-23 by `.kiro/specs/chat-canvas-ui`. Do not implement.

# Tasks: Sealed Surface GUI

Blocked until the container and FUSE mount exist, and until the open decision in design.md is settled.

- [~] (superseded) 1. Scaffold `ui/` with Svelte 5, TypeScript, and a `check` script
- [~] (superseded) 2. Decide and document the chatbot output format and seal enforcement in design.md
  - _Requirements: 2.1, 2.2, 2.3_
- [~] (superseded) 3. Implement the FUSE client against the configurable real mount path
  - _Requirements: 4.1, 4.2_
- [~] (superseded) 4. Implement the sealed host that renders chatbot output
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_
- [~] (superseded) 5. Route rendered actions through grant-checked FUSE call files only
  - _Requirements: 3.1, 3.2, 5.1, 5.2_

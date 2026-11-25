> Parked 2026-11-25: per-tenant Cozo storage, its mounts and the live schema through FUSE are pre-existing 3tched backend work (PREEXISTING.md), not built here. Kept for reference; do not implement.

# Tasks: Tenant Storage

- [~] (parked) 1. Define tenant directory layout and container mount in `container/`
  - _Requirements: 2.1, 2.2_
- [~] (parked) 2. Implement per-tenant Cozo open with RocksDB backend
  - _Requirements: 1.1_
- [~] (parked) 3. Derive tenant id from verified identity and enforce isolation
  - _Requirements: 1.2_
- [~] (parked) 4. Implement the read-only live-schema FUSE file
  - _Requirements: 3.1_
- [~] (parked) 5. Startup mount check with clear error
  - _Requirements: 2.2_

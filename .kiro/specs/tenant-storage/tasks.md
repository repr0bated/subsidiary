# Tasks: Tenant Storage

- [ ] 1. Define tenant directory layout and container mount in `container/`
  - _Requirements: 2.1, 2.2_
- [ ] 2. Implement per-tenant Cozo open with RocksDB backend
  - _Requirements: 1.1_
- [ ] 3. Derive tenant id from verified identity and enforce isolation
  - _Requirements: 1.2_
- [ ] 4. Implement the read-only live-schema FUSE file
  - _Requirements: 3.1_
- [ ] 5. Startup mount check with clear error
  - _Requirements: 2.2_

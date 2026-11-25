# Requirements: Tenant Storage

## Introduction
Each tenant has its own Cozo database backed by RocksDB on host ext4, mounted into the container.

## Requirements

### 1. Isolation
1. WHEN a tenant is created, THE SYSTEM SHALL create a separate Cozo/RocksDB database for it.
2. THE SYSTEM SHALL NOT allow a request for one tenant to read another tenant's database.

### 2. Placement
1. THE SYSTEM SHALL keep database files on host ext4 and mount them into the container.
2. IF the mount is missing at startup, THEN THE SYSTEM SHALL fail with a clear error.

### 3. Schema
1. THE SYSTEM SHALL expose the live schema through FUSE without keeping a copy.

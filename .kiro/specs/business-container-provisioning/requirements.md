> Parked 2026-11-25: the showcase moved to the contracts and the identity (docs/PLAN.md, "What the submission presents"). Provisioning stays in the background in 3tched. Kept for reference; do not implement for the hackathon.

# Requirements: Business Container Provisioning

## Introduction
When a fictional example business hires the service, the system provisions a container for that business from an industry-specific container configuration. The container has its own tenant database and grants. Provisioning is requested only through grant-checked FUSE call files and produces a receipt whose hash can be anchored. The existing 3tched container provisioning and runtime are used as they are; this spec covers the new flow that connects the hire contract to them.

## Requirements

### 1. Trigger
1. WHEN the provider accepts a hire contract, THE SYSTEM SHALL allow a spawn request for that contract's business.
2. THE SYSTEM SHALL NOT provision a container for a contract that has not been accepted.

### 2. Configuration
1. WHEN a spawn is requested, THE SYSTEM SHALL select the container configuration for the business's industry from the fixed list of pre-generated configurations.
2. IF the configuration fails validation, THEN THE SYSTEM SHALL reject the request and report which rule failed.
3. THE SYSTEM SHALL NOT keep a copy of the live schema in this repository.

### 2a. Template and rules
1. THE SYSTEM SHALL generate each business from the shared container configuration schema template, not from a schema written for this project.
2. WHEN a business identity needs the rules that apply to it, THE SYSTEM SHALL provide them from the vectorized compliance corpus through a granted read.

### 3. Provisioning
1. WHEN a valid spawn is admitted, THE SYSTEM SHALL provision one container and one tenant database for the business, with no network beyond the FUSE call-file channel.
2. THE SYSTEM SHALL NOT let one business's container read another business's database.
3. IF provisioning fails part-way, THEN THE SYSTEM SHALL leave no partial container or database and report the failure.

### 4. Grants and admission
1. WHEN a container is provisioned, THE SYSTEM SHALL issue only the grants listed in its configuration.
2. THE SYSTEM SHALL admit a spawn or grant request only if identity, grants and sealed checks all pass, and SHALL show which check failed otherwise.

### 5. Receipts
1. WHEN provisioning completes, THE SYSTEM SHALL append a receipt hash to the hashchain, never a payload or tenant identifier.
2. THE SYSTEM SHALL let the receipt holder check the receipt against an anchored head.

## Decisions
- Runtime: LXD on Ubuntu 26.04, being prepared by Jeremy. Provisioning uses the sealed `lxd` plugin operations (for example `create_instance` and `create_profile`) through FUSE call files. The `incus` plugin is not used.

## Open questions
- Method names for "spawn subsidiary" and "issue grant" (open item in docs/PLAN.md).
- Where the new Rust methods live: this repository or the 3tched backend repository, and how that fits its branch policy.
- Whether the generated Python validation suite is replaced with Rust or shell, to merge cleanly.
- Whether the generated OCI image's HTTP service is dropped, since the container has no network.
- Whether a small CMS view of a provisioned tenant stays in scope.

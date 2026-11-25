# Requirements: Demo, hire and receipt check

## Introduction
The end-to-end demo for the video and for judges: one business identity, one hire, one check against the public record. It ties together `service-contract`, `receipt-anchoring` and `chat-canvas-ui`, and adds nothing to them except the scripted path through. Everything runs locally: anvil on chain 31337 and the 3tched backend on this host.

## Glossary
- **Business**: a fictional example tenant, played by a 3tched identity in the salesman persona.
- **Visitor**: the person hiring the business (the client).
- **Agent**: the sealed 3tched agent that does the work (first choice: `oscal_auditor`).

## Requirements

### Requirement 1: Setup in one step
1. WHEN the demo setup runs, THE system SHALL start anvil if it is not running, deploy `EtchedAnchor` and `HireContract`, and print their addresses.
2. THE setup SHALL read every key from the environment and SHALL NOT write a key to any file.
3. IF preflight fails (anvil not reachable, FUSE views missing), THEN THE setup SHALL stop and name what is missing.

### Requirement 2: The pitch
1. WHEN the visitor opens the chat, THE business SHALL pitch in the salesman persona, offering only what is runnable for the visitor.
2. THE business SHALL show what is present but not runnable as such, and SHALL NOT name capabilities.

### Requirement 3: The hire
1. WHEN the visitor accepts, THE system SHALL write a salted terms document (no personal data), hash it with the canonical rule (`jq -S -c`, keccak256), and create the hire with that hash and a warranty period.
2. WHEN the business accepts the hire, THE UI SHALL show the CHING! burst only on the `HireAccepted` event.

### Requirement 4: The work
1. WHEN the hire is accepted, THE business SHALL have the agent do the task through a sealed method call, and every step SHALL leave a receipt.
2. THE UI SHALL show each receipt as it returns (KA-CHUNK!), and SHALL show `outcome_unknown` as unknown, not retried.

### Requirement 5: On the record
1. WHEN the work is done, THE system SHALL read the receipt-chain head, anchor it, deliver the hire against it, and have both parties confirm.
2. THE UI SHALL show POW! only on the `Anchored` event, and the hire's completion on `HireCompleted`.

### Requirement 6: On the stand
1. WHEN the visitor brings the anchored hash, THE UI SHALL open the accountability view, find the related receipts by meaning, and let the visitor question the business about them.
2. THE business SHALL answer only from its receipts, citing each, and SHALL say when it has no record.
3. WHEN the visitor checks a receipt, THE system SHALL run the holder verifier (`web3/script/verify-hire.sh`) and show its result (BAM! on pass).

### Requirement 7: Honest limits
1. THE demo SHALL NOT claim tamper-proof receipts for events hashed with MD5 (recorded before the Keccak-256 switch); receipts shown in the demo SHALL come from Keccak-256 events.
2. THE demo SHALL label any sample data as sample data.

## Open questions
1. Which sealed method returns the receipt-chain head (receipt-anchoring open question 1).
2. Identity-to-address mapping and who signs for the business (service-contract open question 1); for the demo, anvil test accounts held in the environment.
3. Whether the agent hire waits for the seed networking fix (persona agents need a model path).

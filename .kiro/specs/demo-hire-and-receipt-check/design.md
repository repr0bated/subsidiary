# Design: Demo, hire and receipt check

The demo is a path through three specs, not new machinery: setup and on-chain steps are Foundry scripts in `web3/script/`; the chat steps are the `chat-canvas-ui` session, transport, approval and canvas; the check is `verify-hire.sh`. Bursts fire only on real events (`HireAccepted`, receipts, `Anchored`, verifier pass).

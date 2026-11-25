# Embedding plan

Topic: using this wiki as the chatbot's knowledge base.

## Decision
All models, including any embedding model, run in the backend and are reached only through FUSE. The UI and chatbot never hold a model, an embedding, or a key. They send a request through a call file and receive a result (schema, or retrieved chunks with source URLs).

## Constraints
- Only public research and design notes go in. No tenant data, secrets or schema copies. The live schema stays behind FUSE.
- One topic per file; split pages longer than about 1,500 words by heading.
- Keep source URL and retrieved date with each chunk so answers can cite them.

## Backend side (owned by 3tched)
1. Chunk by heading, prefix each chunk with page title and heading.
2. Embed chunks and queries with the same backend model.
3. Subsidiary gets its own Qdrant collection, separate from the backend's chain vectors. The backend creates and owns it; the UI only asks for retrieval through FUSE. VERIFY whether it is one collection for Subsidiary or one per tenant.
4. Query: embed the question, return top chunks with sources.
5. Re-index when a wiki page changes; a Kiro hook on save for `docs/wiki/**/*.md` can trigger it.

## Not required yet
The wiki is small (under 2,000 words). Loading it whole into context, or plain keyword search, is enough until it grows. Add embeddings when it does.

## Open items
- Which backend method returns knowledge chunks (a FUSE call file name).
- Whether the knowledge base is shared across tenants or per tenant.

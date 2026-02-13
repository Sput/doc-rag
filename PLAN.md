# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Build a public, investor-grade multi-modal RAG demo at `/` that retrieves from a text doc, JSON, and Supabase view, shows staged live logs, and displays intermediate artifacts alongside chat.

## Critical Decisions
Key architectural/implementation choices made during exploration:
- Decision 1: Retrieval strategy is Option C (single embeddings table with per-source filtered searches) - balances clarity and simplicity.
- Decision 2: Pre-embed + cache embeddings - faster demo runtime and consistent results.
- Decision 3: OpenAI models `gpt-4o-mini` + `text-embedding-3-small` - aligned with cost/perf targets.

## Tasks:

- [x] ✅ **Step 1: Public Route + Auth Bypass**
  - [x] ✅ Subtask: Update `proxy.ts` to allow `/` and relevant API routes without login.
  - [x] ✅ Subtask: Ensure `/` is the demo landing page.

- [x] ✅ **Step 2: Data Ingestion + Pre-Embedding**
  - [x] ✅ Subtask: Parse `SSP.docx` via Docling → chunk → embed.
  - [x] ✅ Subtask: Normalize `grype-results.json` items → embed.
  - [x] ✅ Subtask: Query `public.v_evidence_requests_with_context` → format text → embed.
  - [x] ✅ Subtask: Store all embeddings in a single table with `source_type`.

- [x] ✅ **Step 3: Retrieval + Answering Pipeline**
  - [x] ✅ Subtask: Embed query once.
  - [x] ✅ Subtask: Run 3 filtered vector searches (doc/json/db).
  - [x] ✅ Subtask: Merge top-k results and assemble context.
  - [x] ✅ Subtask: Call `gpt-4o-mini` with structured prompt.

- [x] ✅ **Step 4: Demo UI (Chat + Logs + Artifacts)**
  - [x] ✅ Subtask: Build `/` layout with chat panel, live log, and artifact viewers.
  - [x] ✅ Subtask: Implement staged log updates for each pipeline step.
  - [x] ✅ Subtask: Show retrieved snippets per source.
  - [x] ✅ Subtask: Add curated example prompt buttons.

- [x] ✅ **Step 5: Wire-Up + Polish**
  - [x] ✅ Subtask: Connect frontend to API routes.
  - [x] ✅ Subtask: Add loading/empty/error states.
  - [x] ✅ Subtask: Final UI polish for investor demo quality.

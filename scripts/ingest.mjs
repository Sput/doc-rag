import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const envFiles = ['.env.local', '.env'];
envFiles.forEach((file) => {
  dotenv.config({ path: path.join(ROOT, file) });
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const DOCLING_URL = process.env.DOCLING_URL || 'http://localhost:8001/parse';

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env vars.');
}
if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY env var.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function* chunkTextGenerator(text, size = 1000, overlap = 200) {
  let start = 0;
  const length = text.length;
  while (start < length) {
    const end = Math.min(length, start + size);
    if (end <= start) break;
    yield text.slice(start, end);
    if (end === length) break;
    const nextStart = Math.max(0, end - overlap);
    if (nextStart <= start) {
      // Prevent infinite loops when overlap >= remaining length.
      start = end;
    } else {
      start = nextStart;
    }
  }
}

async function openaiEmbeddings(texts) {
  if (texts.length === 0) return [];
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI embeddings error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.data.map((item) => item.embedding);
}

async function readDoclingMarkdown() {
  const docPath = path.join(ROOT, 'SSP.docx');
  const fileBuffer = await fs.readFile(docPath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), 'SSP.docx');

  try {
    const res = await fetch(DOCLING_URL, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Docling error (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (data.markdown) return data.markdown;
  } catch (error) {
    console.warn('Docling unavailable. Falling back to mammoth extraction.');
  }

  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value || '';
}

async function readGrypeItems() {
  const jsonPath = path.join(ROOT, 'grype-results.json');
  const raw = await fs.readFile(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  return (data.matches || []).map((match, index) => {
    const vuln = match.vulnerability || {};
    const artifact = match.artifact || {};

    const text = [
      `Vulnerability: ${vuln.id || 'unknown'}`,
      vuln.severity ? `Severity: ${vuln.severity}` : null,
      vuln.description ? `Description: ${vuln.description}` : null,
      artifact.name ? `Artifact: ${artifact.name}` : null,
      artifact.version ? `Version: ${artifact.version}` : null,
      artifact.type ? `Type: ${artifact.type}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      source_type: 'json',
      source_id: vuln.id || `match-${index}`,
      chunk_index: 0,
      content: text,
      metadata: {
        vulnerability: vuln,
        artifact,
      },
    };
  });
}

async function readEvidenceRows() {
  const { data, error } = await supabase
    .from('v_evidence_requests_with_context')
    .select('*');

  if (error) throw error;

  return (data || []).map((row) => {
    const text = [
      `Evidence request: ${row.evidence_description || 'n/a'}`,
      `Control: ${row.control_name || 'n/a'} (${row.control_uuid || 'n/a'})`,
      `Audit: ${row.audit_name || 'n/a'} (${row.audit_uuid || 'n/a'})`,
    ].join('\n');

    return {
      source_type: 'db',
      source_id: row.evidence_request_id,
      chunk_index: 0,
      content: text,
      metadata: row,
    };
  });
}

async function embedAndUpsert(items) {
  const batchSize = 16;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await embedAndUpsertBatch(batch);
  }
}

async function embedAndUpsertBatch(batch) {
  if (batch.length === 0) return;
  const embeddings = await openaiEmbeddings(batch.map((item) => item.content));

  const rows = batch.map((item, idx) => ({
    ...item,
    embedding: embeddings[idx],
  }));

  const { error } = await supabase
    .from('rag_chunks')
    .upsert(rows, { onConflict: 'source_type,source_id,chunk_index' });

  if (error) throw error;
  console.log(`Upserted ${rows.length} rows.`);
}

async function deleteSource(sourceType) {
  const { error } = await supabase.from('rag_chunks').delete().eq('source_type', sourceType);
  if (error) throw error;
}

async function main() {
  console.log('Starting ingestion...');

  console.log('Clearing existing embeddings...');
  await deleteSource('doc');
  await deleteSource('json');
  await deleteSource('db');

  console.log('Parsing SSP.docx via Docling...');
  const markdown = await readDoclingMarkdown();
  const docChunks = [];
  let docIndex = 0;
  for (const content of chunkTextGenerator(markdown, 1200, 200)) {
    docChunks.push({
      source_type: 'doc',
      source_id: 'SSP.docx',
      chunk_index: docIndex,
      content,
      metadata: { chunk_index: docIndex },
    });
    docIndex += 1;
    if (docChunks.length >= 16) {
      await embedAndUpsertBatch(docChunks.splice(0, docChunks.length));
    }
  }

  console.log('Preparing grype-results.json entries...');
  const jsonItems = await readGrypeItems();

  console.log('Preparing evidence request rows...');
  const dbItems = await readEvidenceRows();

  console.log('Embedding + upserting doc chunks...');
  if (docChunks.length) {
    await embedAndUpsertBatch(docChunks);
  }

  console.log('Embedding + upserting JSON items...');
  await embedAndUpsert(jsonItems);

  console.log('Embedding + upserting DB rows...');
  await embedAndUpsert(dbItems);

  console.log('Ingestion complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

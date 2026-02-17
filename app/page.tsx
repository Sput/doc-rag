'use client';

import { useEffect, useMemo, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type SourceRow = {
  id: string;
  source_type: 'doc' | 'json' | 'db';
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
};

type Sources = {
  doc: SourceRow[];
  json: SourceRow[];
  db: SourceRow[];
};

const PROMPTS = [
  'What evidence requests are most related to incident response, and what SSP context supports them?',
  'Summarize the highest severity vulnerabilities from grype and relate them to SSP controls.',
  'Which SSP sections mention access control, and how do they map to evidence requests?',
];

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Ask me anything about the SSP, the vulnerability scan JSON, or the evidence requests. I will show how the sources connect.',
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<Sources>({ doc: [], json: [], db: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResults = useMemo(() => {
    return sources.doc.length + sources.json.length + sources.db.length > 0;
  }, [sources]);

  async function runQuery(query: string) {
    setLoading(true);
    setError(null);
    setLogs([]);
    setSources({ doc: [], json: [], db: [] });

    const fetchPromise = fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed.');
      }
      return res.json();
    });

    const logSequence = (async () => {
      const steps = [
        'Embedding the query',
        'Searching SSP document chunks',
        'Scanning JSON vulnerability results',
        'Cross-referencing evidence requests',
        'Composing final response',
      ];

      for (const step of steps) {
        setLogs((prev) => [...prev, step]);
        await sleep(320);
      }
    })();

    try {
      const [data] = await Promise.all([fetchPromise, logSequence]);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      setSources({
        doc: data.sources?.doc || [],
        json: data.sources?.json || [],
        db: data.sources?.db || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    await runQuery(query);
  }

  function renderArtifact(row: SourceRow) {
    if (row.source_type === 'json') {
      const vuln = row.metadata?.vulnerability || {};
      return (
        <div className="artifact-card" key={row.id}>
          <h4>{vuln.id || row.source_id}</h4>
          <p>Severity: {vuln.severity || 'n/a'}</p>
          <p>{row.content.slice(0, 160)}...</p>
        </div>
      );
    }

    if (row.source_type === 'db') {
      return (
        <div className="artifact-card" key={row.id}>
          <h4>{row.metadata?.control_name || row.source_id}</h4>
          <p>{row.metadata?.evidence_description || row.content.slice(0, 120)}</p>
          <p>Audit: {row.metadata?.audit_name || 'n/a'}</p>
        </div>
      );
    }

    return (
      <div className="artifact-card" key={row.id}>
        <h4>SSP Chunk #{row.chunk_index + 1}</h4>
        <p>{row.content.slice(0, 180)}...</p>
      </div>
    );
  }

  function DocSources() {
    return (
      <div className="demo-card">
        <div className="chat-header">
          <div className="chat-title">System Security Plan (SSP)</div>
          <span className="demo-kicker">Original File</span>
        </div>
        <p className="demo-subtitle">Inline preview of SSP.docx</p>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <iframe
            title="SSP Preview"
            src="/api/files/ssp/html"
            style={{ width: '100%', height: 520, border: 'none', background: 'white' }}
          />
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <a className="btn-link" href="/api/files/ssp" target="_blank" rel="noreferrer">
            Download original .docx
          </a>
          <span className="demo-kicker">Rendered via Mammoth</span>
        </div>
      </div>
    );
  }

  function JsonSources() {
    const [data, setData] = useState<any | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/files/grype');
          if (!res.ok) throw new Error(await res.text());
          const json = await res.json();
          if (!cancelled) setData(json);
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load JSON');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    return (
      <div className="demo-card">
        <div className="chat-header">
          <div className="chat-title">Vulnerability Scan Results</div>
          <span className="demo-kicker">Original File</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a className="btn-link" href="/api/files/grype" target="_blank" rel="noreferrer">
            Open grype-results.json
          </a>
          {err && <span className="demo-subtitle">Error: {err}</span>}
        </div>
        {data && (
          <pre className="code-block" style={{ maxHeight: 320, overflow: 'auto', marginTop: 8 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  function DbSources() {
    const [rows, setRows] = useState<any[]>([]);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/data/evidence-requests');
          if (!res.ok) throw new Error(await res.text());
          const json = await res.json();
          if (!cancelled) setRows(json.rows || []);
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load data');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    return (
      <div className="demo-card">
        <div className="chat-header">
          <div className="chat-title">Evidence Requests</div>
          <span className="demo-kicker">Original View</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="demo-subtitle">Rows loaded: {rows.length}</span>
          {err && <span className="demo-subtitle">Error: {err}</span>}
        </div>
        {rows.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: 320, marginTop: 8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th style={{ textAlign: 'center' }}>Control</th>
                  <th>Audit</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, idx) => (
                  <tr key={r.evidence_request_id || idx}>
                    <td style={{ minWidth: 240 }}>{r.evidence_description || '—'}</td>
                    <td style={{ minWidth: 220, textAlign: 'center' }}>{r.control_name || '—'}</td>
                    <td style={{ minWidth: 220 }}>{r.audit_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="demo-shell">
      <div className="demo-container">
        <section className="demo-hero">
          <span className="demo-kicker">Multi-Modal RAG</span>
          <h1 className="demo-title">Security Audit Intelligence</h1>
          {/* Subtitle moved below hero to span full width */}
        </section>

        <section>
          <p
            className="demo-subtitle"
            style={{ maxWidth: '100%', marginTop: 8 }}
          >
            This demo retrieves across a security program document, vulnerability JSON, and
            live evidence requests to answer audit questions with full traceability.
          </p>
        </section>

        <section className="demo-card demo-card--soft">
          <div className="chat-header">
            <div className="chat-title">Some sample questions you can ask the AI</div>
            <span className="demo-kicker">Curated Questions</span>
          </div>
          <div className="prompt-row">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="prompt-btn"
                onClick={() => {
                  setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
                  runQuery(prompt);
                }}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="demo-card">
            <div className="chat-header">
              <div className="chat-title">RAG Conversation</div>
              <span className="demo-kicker">Ask Your Question</span>
            </div>
            <div className="chat-window">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`chat-message ${message.role === 'user' ? 'chat-message--user' : ''}`}
                >
                  <span className="chat-meta">{message.role}</span>
                  <div>{message.content}</div>
                </div>
              ))}
            </div>
            <form className="chat-input" onSubmit={handleSubmit}>
              <div className="chat-input-cta">
                <p className="chat-input-cta__title">Start here</p>
                <p className="chat-input-cta__hint">
                  Enter one audit/security question (there are samples listed above) and click Send.
                </p>
              </div>
              <textarea
                className="cta-textarea"
                placeholder="Example: Which SSP sections mention access control and what evidence requests map to them?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <div className="chat-actions">
                <span className="demo-kicker">OpenAI gpt-4o-mini + pgvector</span>
                <button
                  className={`btn-primary ${loading ? 'is-working' : ''}`}
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? 'Working…' : 'Send'}
                </button>
              </div>
              {error && <p className="demo-subtitle">Error: {error}</p>}
            </form>
          </div>
        </section>

        <section className="demo-grid">
          <div className="demo-card">
            <div className="chat-header">
              <div className="chat-title">Live Retrieval Log</div>
              <span className="demo-kicker">Pipeline Steps</span>
            </div>
            <div className="log-list">
              {logs.length === 0 && (
                <div className="log-item">
                  <span className="log-dot" />
                  <span>Waiting for a question...</span>
                </div>
              )}
              {logs.map((log, index) => (
                <div className="log-item" key={`${log}-${index}`}>
                  <span className="log-dot" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="demo-card">
            <div className="chat-header">
              <div className="chat-title">Intermediate Artifacts</div>
              <span className="demo-kicker">Top Matches</span>
            </div>
            {!hasResults && (
              <p className="demo-subtitle">
                Retrieved passages, JSON entries, and evidence requests will appear here.
              </p>
            )}
            {hasResults && (
              <div className="artifact-grid">
                {sources.doc.slice(0, 3).map(renderArtifact)}
                {sources.json.slice(0, 3).map(renderArtifact)}
                {sources.db.slice(0, 3).map(renderArtifact)}
              </div>
            )}
          </div>
        </section>

        {/* Detailed per-source panels */}
        <section className="demo-grid">
          <DocSources />
          <JsonSources />
          <DbSources />
        </section>
      </div>
    </div>
  );
}

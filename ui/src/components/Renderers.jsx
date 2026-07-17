import { useState } from 'react';

// Shared normalization utility
export function normalizePayloadKeys(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalizePayloadKeys);
  }
  if (typeof obj === 'object') {
    const normalized = {};
    for (const [key, val] of Object.entries(obj)) {
      const normalizedKey = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
      normalized[normalizedKey] = normalizePayloadKeys(val);
    }
    return normalized;
  }
  return obj;
}

// 1. Audience Intelligence Renderer
export function AudienceIntelligenceRenderer({ payload }) {
  const normalized = normalizePayloadKeys(payload);
  const personas = normalized.personas || [];
  const primaryId = normalized.primary_persona_id || '';

  const [activePersonaId, setActivePersonaId] = useState(personas.length > 0 ? personas[0].persona_id : '');
  const activePersona = personas.find(p => p.persona_id === activePersonaId) || personas[0];

  if (!activePersona) {
    return <p style={{ color: 'var(--text-secondary)' }}>No persona data available.</p>;
  }

  const highlightKeywords = (text) => {
    if (!text) return '';
    const keywords = [
      'technology landscape', 'IT strategies', 'cybersecurity resilience', 'IT operations', 
      'cost efficiency', 'budget adherence', 'system uptime', 'vendor relationships',
      'digital transformation', 'cloud migration', 'compliance', 'security incident',
      'scalability', 'innovation', 'liability', 'ROI'
    ];
    let highlighted = String(text);
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<strong style="color: var(--accent);">$1</strong>');
    });
    return highlighted;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        {personas.map(p => (
          <button
            key={p.persona_id}
            onClick={() => setActivePersonaId(p.persona_id)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: activePersonaId === p.persona_id ? 'rgba(79,70,229,0.15)' : 'transparent', color: activePersonaId === p.persona_id ? '#a5b4fc' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            👤 {p.name} ({p.title}) {p.persona_id === primaryId && '⭐'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>Demographics & Role</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', textTransform: 'uppercase' }}>Company Size</span>
                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{activePersona.company_size}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', textTransform: 'uppercase' }}>Seniority</span>
                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{activePersona.seniority}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', textTransform: 'uppercase' }}>Buying Role</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>{activePersona.buying_committee_role?.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem' }}>A Day in the Life</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }} dangerouslySetInnerHTML={{ __html: highlightKeywords(activePersona.day_in_life) }} />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>Success Metrics (KPIs)</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activePersona.measured_on?.map((kpi, idx) => (
                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{kpi}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase' }}>💔 Critical Pain Points</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activePersona.pain_points?.map((pt, idx) => (
                <div key={idx} style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.25rem', borderRadius: '10px' }}>
                  <p style={{ color: '#fff', fontSize: '0.9rem', fontStyle: 'italic', margin: '0 0 0.5rem 0' }}>"{pt.quote}"</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#666' }}>
                    <span>Source: {pt.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase' }}>🛡️ Buying Objections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activePersona.objections?.map((obj, idx) => (
                <div key={idx} style={{ background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.1)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#ccc' }}>
                  ❓ "{obj}"
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Email Sequence Renderer
export function EmailSequenceRenderer({ payload }) {
  const normalized = normalizePayloadKeys(payload);
  const sequences = normalized?.email_sequences || (normalized?.steps || normalized?.emails ? [normalized] : []);
  const [activeIdx, setActiveIdx] = useState(0);

  if (sequences.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No email sequences available.</p>;
  }

  const currentSeq = sequences[activeIdx] || sequences[0];
  const steps = currentSeq.steps || currentSeq.emails || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
      {sequences.length > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {sequences.map((seq, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: activeIdx === idx ? 'rgba(16,185,129,0.15)' : 'transparent', color: activeIdx === idx ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              ✉️ {seq.purpose || seq.sequence_id || `Sequence ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem' }}>
        <h3 style={{ color: '#eaf1ff', marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
          🎯 {currentSeq.purpose || 'Email Sequence Campaign'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          {currentSeq.trigger && (
            <div>
              <span style={{ color: '#888', display: 'block', marginBottom: '0.2rem' }}>TRIGGER EVENT</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{currentSeq.trigger}</span>
            </div>
          )}
          {currentSeq.primary_persona_id && (
            <div>
              <span style={{ color: '#888', display: 'block', marginBottom: '0.2rem' }}>TARGET PERSONA</span>
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{currentSeq.primary_persona_id}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {steps.map((email, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#10b981', fontWeight: 600, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Step {email.step_number || (i + 1)} {email.delay_after_prior_step_hours ? `(Wait ${email.delay_after_prior_step_hours}h)` : '(Instant)'}</span>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {email.subject && (
                <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#999', fontSize: '0.9rem' }}>
                  Subject: <strong style={{ color: '#eaf1ff' }}>{email.subject}</strong>
                </div>
              )}
              {email.preheader && (
                <div style={{ marginBottom: '1rem', color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Preheader: {email.preheader}
                </div>
              )}
              <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8, fontSize: '0.9rem' }}>
                {email.body_markdown || email.body}
              </div>
              {email.cta && (
                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button style={{ background: '#10b981', color: '#000', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {email.cta}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Custom Markdown & Table Renderer
export function MarkdownRenderer({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  
  const renderTextWithFormatting = (txt) => {
    if (!txt) return '';
    let formatted = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const terms = [
      'North Star KPI', 'ROI', 'Objective Decisions', 'IT efficiency', 'IT operations', 
      'cybersecurity resilience', 'cloud migration', 'compliance', 'security incident', 'downtime'
    ];
    terms.forEach(t => {
      const regex = new RegExp(`\\b(${t})\\b`, 'gi');
      formatted = formatted.replace(regex, '<span style="color: var(--accent); font-weight: 600;">$1</span>');
    });
    return formatted;
  };

  const flushTable = (tableRows, key) => {
    if (!tableRows || tableRows.length === 0) return null;
    
    const headers = tableRows[0]
      .split('|')
      .map(h => h.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const bodyRowsData = tableRows.slice(1).filter(r => !r.includes('---|') && !r.includes(':---'));

    return (
      <div key={key} style={{ overflowX: 'auto', margin: '1.25rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#bdc1c6', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '0.75rem 1rem', color: 'white', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRowsData.map((row, rIdx) => {
              const cells = row
                .split('|')
                .map(c => c.trim())
                .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
              return (
                <tr key={rIdx} style={{ borderBottom: rIdx < bodyRowsData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  {cells.map((c, cIdx) => (
                    <td key={cIdx} style={{ padding: '0.75rem 1rem' }} dangerouslySetInnerHTML={{ __html: renderTextWithFormatting(c) }} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  let tableAccumulator = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      tableAccumulator.push(line);
      continue;
    }

    if (tableAccumulator.length > 0) {
      elements.push(flushTable(tableAccumulator, `table-${i}`));
      tableAccumulator = [];
    }

    if (!line) {
      elements.push(<div key={`space-${i}`} style={{ height: '0.75rem' }} />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ color: 'white', marginTop: '1.25rem', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 600, borderLeft: '3px solid var(--accent)', paddingLeft: '0.5rem', textAlign: 'left' }}>
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} style={{ color: 'white', marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 600, borderLeft: '4px solid var(--accent)', paddingLeft: '0.75rem', textAlign: 'left' }}>
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} style={{ color: 'white', marginTop: '1.75rem', marginBottom: '1rem', fontSize: '1.4rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', textAlign: 'left' }}>
          {line.replace('# ', '')}
        </h1>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6', margin: '0.35rem 0', textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: renderTextWithFormatting(line) }} />
      );
    }
  }

  if (tableAccumulator.length > 0) {
    elements.push(flushTable(tableAccumulator, `table-end`));
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{elements}</div>;
}

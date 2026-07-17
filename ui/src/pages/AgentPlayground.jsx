import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader, AlertTriangle, CheckCircle, FileText, Globe, Info } from 'lucide-react';
import { 
  normalizePayloadKeys, 
  AudienceIntelligenceRenderer, 
  EmailSequenceRenderer,
  MarkdownRenderer
} from '../components/Renderers';

const AGENTS = [
  { id: 'brief_intake', name: 'Brief Intake (Phase 1)', phase: 'Phase 1 - Research' },
  { id: 'market_research', name: 'Market Research (Phase 1)', phase: 'Phase 1 - Research' },
  { id: 'audience_intelligence', name: 'Audience Intelligence (Phase 1)', phase: 'Phase 1 - Research' },
  { id: 'keyword_intent', name: 'Keyword Intent (Phase 1)', phase: 'Phase 1 - Research' },
  { id: 'research_synthesis', name: 'Research Synthesis (Phase 1)', phase: 'Phase 1 - Research' },
  
  { id: 'positioning', name: 'Positioning Statement (Phase 2)', phase: 'Phase 2 - Narrative' },
  { id: 'value_proposition', name: 'Value Proposition Set (Phase 2)', phase: 'Phase 2 - Narrative' },
  { id: 'messaging_matrix', name: 'Messaging Matrix (Phase 2)', phase: 'Phase 2 - Narrative' },
  { id: 'content_pillars', name: 'Content Pillar Set (Phase 2)', phase: 'Phase 2 - Narrative' },
  { id: 'narrative_lock', name: 'Narrative Lock Doc (Phase 2)', phase: 'Phase 2 - Narrative' },
  
  { id: 'website_copy', name: 'Website Copy Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  { id: 'content_assets', name: 'Content Asset Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  { id: 'email_sequences', name: 'Email Sequence Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  { id: 'social_content', name: 'Social Content Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  { id: 'paid_ad_creative', name: 'Paid Ad Creative Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  { id: 'sales_enablement', name: 'Sales Enablement Pack (Phase 3)', phase: 'Phase 3 - Asset Creation' },
  
  { id: 'channel_strategy', name: 'Channel Plan (Phase 4)', phase: 'Phase 4 - Activation' },
  { id: 'campaign_calendar', name: 'Campaign Calendar (Phase 4)', phase: 'Phase 4 - Activation' },
  { id: 'seo_activation', name: 'SEO Activation Pack (Phase 4)', phase: 'Phase 4 - Activation' },
  { id: 'paid_media', name: 'Paid Media Setup Pack (Phase 4)', phase: 'Phase 4 - Activation' },
  { id: 'outbound_partner', name: 'Outbound Partner Pack (Phase 4)', phase: 'Phase 4 - Activation' },
  { id: 'community_activation', name: 'Community Activation Pack (Phase 4)', phase: 'Phase 4 - Activation' },
  
  { id: 'measurement', name: 'KPI Framework (Phase 5)', phase: 'Phase 5 - Measurement' },
  { id: 'experiment_review', name: 'Experiment (Phase 5)', phase: 'Phase 5 - Measurement' },
  { id: 'competitive_pulse', name: 'Competitor Profile (Phase 5)', phase: 'Phase 5 - Measurement' },
  { id: 'executive_brief', name: 'Executive Brief (Phase 5)', phase: 'Phase 5 - Measurement' },
  { id: 'iteration_planner', name: 'Iteration Planner (Phase 5)', phase: 'Phase 5 - Measurement' }
];

function MarketResearchRenderer({ payload }) {
  const [tab, setTab] = useState('competitors');
  
  const competitors = payload.competitors || [];
  const landscape = payload['market landscape'] || payload['market_landscape'] || {};
  const whitespace = payload['positioning whitespace'] || payload['positioning_whitespace'] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setTab('competitors')}
          style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'competitors' ? 'rgba(245,158,11,0.15)' : 'transparent', color: tab === 'competitors' ? '#f59e0b' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
        >
          🏢 Competitors ({competitors.length})
        </button>
        <button
          onClick={() => setTab('landscape')}
          style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'landscape' ? 'rgba(79,70,229,0.15)' : 'transparent', color: tab === 'landscape' ? '#a5b4fc' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
        >
          📊 Market Landscape
        </button>
        <button
          onClick={() => setTab('whitespace')}
          style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'whitespace' ? 'rgba(16,185,129,0.15)' : 'transparent', color: tab === 'whitespace' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
        >
          🎯 Whitespace
        </button>
      </div>

      {/* Competitors Tab */}
      {tab === 'competitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {competitors.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No competitors analyzed.</p>}
          {competitors.map((comp, idx) => (
            <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: '#eaf1ff', margin: 0, fontSize: '1rem' }}>{comp.name}</h4>
                  {comp.url && <a href={comp.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#f59e0b', textDecoration: 'none' }}>{comp.url}</a>}
                </div>
                {comp.review_rating && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>⭐ {comp.review_rating}</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>POSITIONING STATEMENT</div>
                  <p style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>{comp.positioning}</p>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>KEY DIFFERENTIATOR</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>{comp.key_differentiator}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                  <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>👍 STRENGTHS</div>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: 0 }}>
                      {comp.praise_points?.map((pt, i) => <li key={i}>{pt}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>👎 WEAKNESSES</div>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: 0 }}>
                      {comp.weaknesses?.map((wt, i) => <li key={i}>{wt}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Landscape Tab */}
      {tab === 'landscape' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(79,70,229,0.03)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Addressable Market (TAM)</div>
              <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{landscape.tam_estimate || 'No TAM estimate available.'}</p>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Annual Market Growth Rate</div>
              <p style={{ color: 'white', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{landscape.growth_rate || 'No growth rate declared.'}</p>
            </div>
          </div>

          <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>🌟 CORE OPPORTUNITIES</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>{landscape.biggest_opportunity}</p>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>⚠️ CRITICAL THREATS</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>{landscape.biggest_threat}</p>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>📈 Key Market Dynamics</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {landscape.top_3_dynamics?.map((d, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#ccc', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Whitespace Tab */}
      {tab === 'whitespace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>❌ CROWDED COMPETITIVE TERRITORIES</div>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: 0 }}>
                {whitespace.crowded_territories?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>✅ UNDERSERVED OPPORTUNITY TERRITORIES</div>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: 0 }}>
                {whitespace.underserved_territories?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>🏹 Recommended Differentiation Angles</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {whitespace.recommended_angles?.map((angle, i) => (
                <div key={i} style={{ border: '1px solid rgba(79,70,229,0.2)', borderRadius: '10px', background: 'rgba(79,70,229,0.02)', padding: '1rem' }}>
                  <div style={{ color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Angle {i+1}: {angle.angle}</div>
                  <p style={{ color: '#bdc1c6', fontSize: '0.75rem', lineHeight: 1.4, margin: '0 0 0.25rem 0' }}><strong>Rationale:</strong> {angle.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function AgentPlayground({ tenants = [] }) {
  const [company, setCompany] = useState('Slack');
  const [industry, setIndustry] = useState('B2B Team Collaboration');
  const [agent, setAgent] = useState('market_research');
  const [customInstructions, setCustomInstructions] = useState('');
  
  const [destTenant, setDestTenant] = useState(tenants.length > 0 ? tenants[0].id : '');
  const [destCycle, setDestCycle] = useState('2026-Q3');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenants.length > 0 && !destTenant) {
      setDestTenant(tenants[0].id);
    }
  }, [tenants]);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');

  const handleGenerate = async () => {
    if (!company.trim() || !industry.trim()) {
      alert('Please fill in both Company Name and Industry/Product details.');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setLoadingStage('Initializing AI Agent...');

    // Simulate step messages
    const stages = [
      'Loading agent prompt instructions...',
      'Compiling custom industry and company context...',
      'Executing multi-stage synthesis & copywriting...',
      'Formatting and preparing response...'
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoadingStage(stages[currentStage]);
        currentStage++;
      }
    }, 2000);

    try {
      const response = await fetch('/api/agent-playground-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, industry, agent, customInstructions })
      });
      clearInterval(interval);
      
      const data = await response.json();
      setResult(data);
    } catch (e) {
      clearInterval(interval);
      setResult({ success: false, error: 'Network error. Failed to run agent.' });
    }
    setIsLoading(false);
  };

  const handleApproveSave = async () => {
    if (!destTenant) {
      alert('Please select a destination company workspace first.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/outputs/${destTenant}/${destCycle}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, payload: result.payload })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Success! Generated B2B asset approved and saved to company workspace (${destTenant} -> ${destCycle}).`);
      } else {
        alert(data.error || 'Failed to save asset.');
      }
    } catch (e) {
      alert('Network error. Failed to save approved asset.');
    }
    setIsSaving(false);
  };

  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard this generated asset?')) {
      setResult(null);
    }
  };

  const renderPayloadDetails = (rawPayload) => {
    let payload = rawPayload;
    if (!payload) return null;

    // Robust client-side JSON extractor & parser
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      const firstCurly = trimmed.indexOf('{');
      const lastCurly = trimmed.lastIndexOf('}');
      const firstBracket = trimmed.indexOf('[');
      const lastBracket = trimmed.lastIndexOf(']');

      let potentialJson = null;
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        potentialJson = trimmed.substring(firstCurly, lastCurly + 1);
      } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        potentialJson = trimmed.substring(firstBracket, lastBracket + 1);
      }

      if (potentialJson) {
        try {
          payload = JSON.parse(potentialJson);
        } catch (e) {
          try {
            const cleanJson = potentialJson
              .replace(/[\u201C\u201D]/g, '"')
              .replace(/[\u2018\u2019]/g, "'");
            payload = JSON.parse(cleanJson);
          } catch (err) {}
        }
      }
    }

    payload = normalizePayloadKeys(payload);

    if (agent === 'audience_intelligence' || payload.personas) {
      return <AudienceIntelligenceRenderer payload={payload} />;
    }
    
    if (agent === 'email_sequences' || payload.steps || payload.emails || payload.email_sequences) {
      return <EmailSequenceRenderer payload={payload} />;
    }
    
    if (agent === 'market_research' || payload.competitors || payload['market landscape'] || payload['positioning whitespace']) {
      return <MarketResearchRenderer payload={payload} />;
    }
    
    if (typeof payload === 'string') {
      return <MarkdownRenderer text={payload} />;
    }
    
    const formatValueText = (text) => {
      if (!text) return '';
      const txt = String(text);
      let formatted = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const terms = [
        'Total Addressable Market', 'target audience', 'positioning statement', 'competitive advantages',
        'lead generation', 'value proposition', 'conversion rate', 'customer acquisition cost',
        'digital footprint', 'organic traffic', 'marketing channel', 'email campaign', 'search ads',
        'project velocity', 'decision cycles', 'project visibility', 'scattered communication',
        'roadblocks', 'workflow', 'deliverables', 'stakeholder communication', 'proof points',
        'messaging matrix', 'value props'
      ];
      terms.forEach(t => {
        const regex = new RegExp(`\\b(${t})\\b`, 'gi');
        formatted = formatted.replace(regex, '<span style="color: var(--accent); font-weight: 600;">$1</span>');
      });
      return formatted;
    };

    const renderSmartObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return <p style={{ color: '#ccc', fontSize: '0.88rem', lineHeight: '1.6', margin: '0.25rem 0' }} dangerouslySetInnerHTML={{ __html: formatValueText(obj) }} />;
      }

      if (Array.isArray(obj)) {
        const firstItem = obj[0];
        if (firstItem && typeof firstItem === 'object' && (firstItem.term || firstItem.keyword || firstItem.keyword_term)) {
          const headers = ['Keyword / Search Term', 'Monthly Volume', 'Difficulty (KD)', 'Search Intent'];
          return (
            <div style={{ overflowX: 'auto', margin: '1rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#bdc1c6', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {headers.map((h, idx) => <th key={idx} style={{ padding: '0.5rem 0.75rem', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {obj.map((item, idx) => {
                    const normItem = normalizePayloadKeys(item);
                    const keywordVal = normItem.term || normItem.keyword || normItem.keyword_term || '—';
                    const volumeVal = normItem.volume || normItem.search_volume || normItem.monthly_volume || '—';
                    const diffVal = normItem.difficulty || normItem.seo_difficulty || normItem.kd || '—';
                    const intentVal = normItem.intent || normItem.search_intent || normItem.funnel_stage || '—';
                    return (
                      <tr key={idx} style={{ borderBottom: idx < obj.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'white' }}>🔑 {keywordVal}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{volumeVal}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px', 
                            background: typeof diffVal === 'number' && diffVal > 50 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
                            color: typeof diffVal === 'number' && diffVal > 50 ? '#ef4444' : '#10b981' 
                          }}>
                            {diffVal}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ background: 'rgba(79,70,229,0.15)', color: '#a5b4fc', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                            {String(intentVal).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        const isAllPrimitives = obj.every(item => typeof item !== 'object');
        if (isAllPrimitives) {
          const joinedParagraph = obj.map(item => {
            let s = String(item).trim();
            if (s && !/[.!?]$/.test(s)) s += '.';
            return s;
          }).join(' ');
          return (
            <p 
              style={{ color: '#bdc1c6', fontSize: '0.88rem', lineHeight: '1.6', margin: '0.25rem 0', textAlign: 'left' }}
              dangerouslySetInnerHTML={{ __html: formatValueText(joinedParagraph) }}
            />
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {obj.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem', borderLeft: '3px solid var(--accent)' }}>
                {renderSmartObject(item)}
              </div>
            ))}
          </div>
        );
      }

      const entries = Object.entries(obj).filter(([key]) => {
        return key !== 'schema_version' && key !== 'written_by_agent' && key !== 'written_at' && key !== 'tenant_id' && key !== 'cycle_id';
      });

      const titleEntry = entries.find(([key]) => key.toLowerCase() === 'title' || key.toLowerCase() === 'name');
      const descEntry = entries.find(([key]) => key.toLowerCase().includes('description') || key.toLowerCase() === 'summary' || key.toLowerCase().includes('statement') || key.toLowerCase() === 'message' || key.toLowerCase() === 'pov_statement');
      
      const otherEntries = entries.filter(([key]) => key !== titleEntry?.[0] && key !== descEntry?.[0]);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          {(titleEntry || descEntry) && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
              {titleEntry && (
                <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                  {String(titleEntry[1])}
                </h4>
              )}
              {descEntry && (
                <p style={{ color: '#eaf1ff', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }} dangerouslySetInnerHTML={{ __html: formatValueText(descEntry[1]) }} />
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.88rem' }}>
            {otherEntries.map(([key, val]) => {
              const displayKey = key.replace(/_/g, ' ').toUpperCase();
              const isComplex = typeof val === 'object' && val !== null;

              if (!isComplex && (key.toLowerCase().endsWith('id') || key.toLowerCase() === 'type' || key.toLowerCase() === 'channel' || key.toLowerCase() === 'funnel_stage' || key.toLowerCase() === 'priority')) {
                return (
                  <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#888' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{displayKey}:</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.35rem', borderRadius: '4px', color: '#ccc' }}>{String(val)}</span>
                  </div>
                );
              }

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {displayKey}
                  </span>
                  <div>
                    {isComplex ? renderSmartObject(val) : (
                      <p style={{ color: '#bdc1c6', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }} dangerouslySetInnerHTML={{ __html: formatValueText(val) }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return renderSmartObject(payload);
  };

  return (
    <div className="animated-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* Configuration Input Form */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <Sparkles size={24} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Interactive Agent Playground</h2>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Company / Product Name</label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className="glass-input"
            placeholder="e.g. HCLTech, Slack, Microsoft Teams"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Primary Industry & Target Topic</label>
          <textarea
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className="glass-input"
            placeholder="e.g. Cloud Logistics, DevSecOps SaaS solutions..."
            rows={2}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', resize: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select AI Agent Specialist</label>
          <select
            value={agent}
            onChange={e => setAgent(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          >
            {AGENTS.map(ag => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Destination Company</label>
            <select
              value={destTenant}
              onChange={e => setDestTenant(e.target.value)}
              className="glass-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            >
              <option value="">-- Select Company --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Campaign Cycle</label>
            <input
              type="text"
              value={destCycle}
              onChange={e => setDestCycle(e.target.value)}
              className="glass-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Custom Directions / Focus Area (Optional)</label>
          <textarea
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder="e.g. Target mid-market companies, focus heavily on pricing or cost efficiency..."
            rows={3}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', resize: 'none' }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--accent)',
            color: '#000',
            fontWeight: 'bold',
            marginTop: '0.5rem'
          }}
        >
          {isLoading ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Analyzing & Generating...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Generate Custom Asset</span>
            </>
          )}
        </button>
      </div>

      {/* Generation Outputs Card */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Generated Output Preview</h2>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)' }}>
            <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontWeight: 600, marginBottom: '0.25rem' }}>AI Agent at Work</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loadingStage}</div>
            </div>
          </div>
        ) : !result ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
            <Info size={40} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Playground Ready</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px' }}>
                Fill in the details on the left and trigger the AI specialist to generate targeted market assets instantly.
              </p>
            </div>
          </div>
        ) : result.success ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                <CheckCircle size={18} />
                <span>Asset Generated Successfully</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigator.clipboard.writeText(typeof result.payload === 'object' ? JSON.stringify(result.payload, null, 2) : result.payload)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleApproveSave}
                  disabled={isSaving}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.15)', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  {isSaving ? 'Saving...' : '✅ Approve & Save'}
                </button>
                <button
                  onClick={handleDiscard}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  ❌ Discard
                </button>
              </div>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: '480px' }}>
              {renderPayloadDetails(result.payload)}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--danger)', padding: '2rem', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', background: 'rgba(239,68,68,0.05)' }}>
            <AlertTriangle size={36} />
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Generation Failed</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>{result.error || 'Unknown error occurred.'}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

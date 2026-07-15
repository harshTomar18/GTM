import { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, FileText, UserCheck, Loader } from 'lucide-react';

const ALL_AGENTS = [
  { id: 'brief_intake', name: 'Brief Intake' },
  { id: 'market_research', name: 'Market Research' },
  { id: 'audience_intelligence', name: 'Audience Intelligence' },
  { id: 'keyword_intent', name: 'Keyword Intent' },
  { id: 'research_synthesis', name: 'Research Synthesis' },
  { id: 'positioning', name: 'Positioning Statement' },
  { id: 'value_proposition', name: 'Value Proposition Set' },
  { id: 'messaging_matrix', name: 'Messaging Matrix' },
  { id: 'content_pillars', name: 'Content Pillar Set' },
  { id: 'narrative_lock', name: 'Narrative Lock Doc' },
  { id: 'website_copy', name: 'Website Copy Pack' },
  { id: 'content_assets', name: 'Content Asset Pack' },
  { id: 'email_sequences', name: 'Email Sequence Pack' },
  { id: 'social_content', name: 'Social Content Pack' },
  { id: 'paid_ad_creative', name: 'Paid Ad Creative Pack' },
  { id: 'sales_enablement', name: 'Sales Enablement Pack' },
  { id: 'channel_strategy', name: 'Channel Plan' },
  { id: 'campaign_calendar', name: 'Campaign Calendar' },
  { id: 'seo_activation', name: 'SEO Activation Pack' },
  { id: 'paid_media', name: 'Paid Media Setup Pack' },
  { id: 'outbound_partner', name: 'Outbound Partner Pack' },
  { id: 'community_activation', name: 'Community Activation Pack' },
  { id: 'measurement', name: 'KPI Framework' },
  { id: 'experiment_review', name: 'Experiment' },
  { id: 'competitive_pulse', name: 'Competitor Profile' },
  { id: 'executive_brief', name: 'Executive Brief' },
  { id: 'iteration_planner', name: 'Iteration Planner' }
];

export default function EmailDispatcher({ tenants = [] }) {
  const [selectedTenant, setSelectedTenant] = useState(tenants.length > 0 ? tenants[0].id : '_example');
  const [selectedCycle, setSelectedCycle] = useState('2026-Q3');
  const [selectedAgent, setSelectedAgent] = useState('email_sequences');
  
  // Dynamic lists from backend
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [agentOutput, setAgentOutput] = useState(null);
  
  // Custom message overrides
  const [customSubject, setCustomSubject] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  
  // UI Status
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch stakeholder roles & generated outputs
  useEffect(() => {
    if (!selectedTenant) return;
    setIsLoading(true);
    setResult(null);
    setAgentOutput(null);

    // 1. Fetch Company profile details (for stakeholders)
    fetch(`/api/tenant-profile/${selectedTenant}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          const roles = data.profile.approval_roles || [];
          setStakeholders(roles);
          if (roles.length > 0) {
            setSelectedStakeholder(roles[0]);
          } else {
            setSelectedStakeholder(null);
          }
        }
      })
      .catch(err => console.error("Error loading stakeholders", err));

    // 2. Fetch all generated outputs
    fetch(`/api/outputs/${selectedTenant}/${selectedCycle}`)
      .then(res => res.json())
      .then(data => {
        const found = (data.outputs || []).find(o => o.agent === selectedAgent);
        if (found) {
          setAgentOutput(found.payload);
          setCustomSubject(`GTM OS Dispatch: AI Marketing ${ALL_AGENTS.find(a => a.id === selectedAgent)?.name || selectedAgent}`);
        } else {
          setAgentOutput(null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading output", err);
        setIsLoading(false);
      });
  }, [selectedTenant, selectedCycle, selectedAgent]);

  const handleSendEmail = async () => {
    if (!selectedStakeholder || !selectedStakeholder.email) {
      alert("Please select a stakeholder with a valid email address.");
      return;
    }
    if (!agentOutput) {
      alert("No AI generated content found for this agent. Please generate content first.");
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: selectedTenant,
          cycle: selectedCycle,
          agent: selectedAgent,
          stakeholder: selectedStakeholder,
          subject: customSubject,
          notes: customNotes
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: 'Network error failed to send email.' });
    }
    setIsSending(false);
  };

  return (
    <div className="animated-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* Configuration Card */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <Mail size={24} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Email Dispatcher Workspace</h2>
        </div>

        {/* Company Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Company / Tenant</label>
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
        </div>

        {/* Stakeholder Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Stakeholder / Recipient</label>
          {stakeholders.length === 0 ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ No stakeholder roles found in this company profile.</p>
          ) : (
            <select
              value={selectedStakeholder ? selectedStakeholder.role : ''}
              onChange={e => {
                const found = stakeholders.find(s => s.role === e.target.value);
                setSelectedStakeholder(found);
              }}
              className="glass-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            >
              {stakeholders.map(s => (
                <option key={s.role} value={s.role}>{s.role} - {s.name} ({s.email || 'No email'})</option>
              ))}
            </select>
          )}
        </div>

        {/* Stakeholder Member Details Card */}
        {selectedStakeholder && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'white' }}>
              <UserCheck size={16} style={{ color: 'var(--success)' }} />
              Recipient Details
            </div>
            <div style={{ color: 'var(--text-secondary)', display: 'grid', gap: '0.25rem' }}>
              <div><strong>Name:</strong> {selectedStakeholder.name}</div>
              <div><strong>Email:</strong> {selectedStakeholder.email || 'N/A'}</div>
              <div><strong>Scope:</strong> {selectedStakeholder.scope ? selectedStakeholder.scope.join(', ') : 'All'}</div>
            </div>
          </div>
        )}

        {/* AI Agent Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>AI Agent Content Source</label>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          >
            {ALL_AGENTS.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>

        {/* Subject Override */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Subject Line</label>
          <input
            type="text"
            value={customSubject}
            onChange={e => setCustomSubject(e.target.value)}
            placeholder="Enter custom email subject"
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        {/* Custom Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Additional Context / Review Comments</label>
          <textarea
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Add specific comments or change instructions for the stakeholder..."
            rows={3}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', resize: 'none' }}
          />
        </div>

        {/* Dispatch Action */}
        <button
          onClick={handleSendEmail}
          disabled={isSending || !agentOutput || !selectedStakeholder}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: (!agentOutput || !selectedStakeholder) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
            cursor: (!agentOutput || !selectedStakeholder) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSending ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Sending Dispatch...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Dispatch Email to Stakeholder</span>
            </>
          )}
        </button>

        {/* Result Notification */}
        {result && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              background: result.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
              {result.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {result.success ? 'Dispatch Successful!' : 'Dispatch Failed'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{result.message}</p>
            {result.previewUrl && (
              <a
                href={result.previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'underline', marginTop: '0.25rem' }}
              >
                🔗 Open Developer Email Preview
              </a>
            )}
          </div>
        )}
      </div>

      {/* Asset Preview Panel */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Asset Output Preview</h2>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
            <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span>Retrieving generated content...</span>
          </div>
        ) : !agentOutput ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>No Content Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px' }}>
                The selected agent has not generated output for this campaign cycle. Generate it in **Agent Workflow & Run** tab.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '450px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {typeof agentOutput === 'object' ? JSON.stringify(agentOutput, null, 2) : agentOutput}
              </pre>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

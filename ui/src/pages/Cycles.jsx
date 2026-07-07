import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DAG_PHASES = [
  {
    id: 1, name: "Research & Market Intelligence",
    agents: ['brief_intake', 'market_research', 'audience_intelligence', 'keyword_intent', 'research_synthesis']
  },
  {
    id: 2, name: "Narrative & Messaging Architecture",
    agents: ['positioning', 'value_proposition', 'messaging_matrix', 'content_pillars', 'narrative_lock']
  },
  {
    id: 3, name: "Asset Creation",
    agents: ['website_copy', 'content_assets', 'email_sequences', 'social_content', 'paid_ad_creative', 'sales_enablement']
  },
  {
    id: 4, name: "Distribution & Activation",
    agents: ['channel_strategy', 'campaign_calendar', 'seo_activation', 'paid_media', 'outbound_partner', 'community_activation']
  },
  {
    id: 5, name: "Measurement & Iteration",
    agents: ['measurement', 'experiment_review', 'competitive_pulse', 'executive_brief', 'iteration_planner']
  }
];

export default function Cycles({ tenants = [] }) {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(tenants.length > 0 ? tenants[0].id : '_example');
  const [cycle, setCycle] = useState('2026-Q3');
  const [cycles, setCycles] = useState([{ id: '2026-Q3' }]);
  const [objective, setObjective] = useState('');
  const [agent, setAgent] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch cycles for the selected tenant
  const loadCycles = async (selectedTenant) => {
    try {
      const res = await fetch(`/api/cycles/${selectedTenant}`);
      const data = await res.json();
      if (data.cycles && data.cycles.length > 0) {
        setCycles(data.cycles);
        setCycle(data.cycles[0].id);
      } else {
        setCycles([{ id: '2026-Q3' }]);
        setCycle('2026-Q3');
      }
    } catch {
      setCycles([{ id: '2026-Q3' }]);
      setCycle('2026-Q3');
    }
  };

  useState(() => {
    if (tenant) loadCycles(tenant);
  }, [tenant]);

  const handleTenantChange = (newTenant) => {
    setTenant(newTenant);
    loadCycles(newTenant);
  };

  const handleStart = async (isLive) => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/cycle-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, cycle, isLive, objective })
      });
      const data = await res.json();
      setResult(data);
      // Reload cycles in case a new one was initialized
      loadCycles(tenant);

      if (data.success) {
        setTimeout(() => {
          navigate(`/content?tenant=${tenant}&cycle=${cycle}`);
        }, 1500);
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to connect to backend' });
    }
    setIsLoading(false);
  };

  const handleAgentRun = async () => {
    if (!tenant || !cycle || !agent) return alert('Enter Tenant, Cycle, and Agent Slug.');
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/agent-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, cycle, agent })
      });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          navigate(`/content?tenant=${tenant}&cycle=${cycle}&agent=${agent}`);
        }, 1500);
      }
    } catch (e) {
      setResult({ success: false, message: 'Network error.' });
    }
    setIsLoading(false);
  };

  const renderTenantSelector = () => {
    if (tenants.length > 0) {
      return (
        <select 
          value={tenant}
          onChange={(e) => handleTenantChange(e.target.value)}
          className="glass-input"
          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
        >
          {tenants.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
        </select>
      );
    }
    return (
      <input type="text" className="glass-input" value={tenant} onChange={e => handleTenantChange(e.target.value)} placeholder="e.g. acme_corp" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Visual DAG Representation */}
      <div className="glass-card animated-page" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1.5rem', fontWeight: 600 }}>System DAG Overview</h2>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {DAG_PHASES.map((phase) => (
            <div key={phase.id} style={{ minWidth: '220px', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Phase {phase.id}
              </div>
              <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.3 }}>
                {phase.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {phase.agents.map(a => (
                  <div key={a} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* /gtm-cycle-start */}
        <div className="glass-card animated-page" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">Agent Dependency Map</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Start a GTM cycle for a tenant (dry-run by default; pass <code>live=true</code> to execute).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>tenant=&lt;id&gt;</label>
              {renderTenantSelector()}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cycle ID</label>
              <select 
                value={cycle} 
                onChange={e => setCycle(e.target.value)} 
                className="glass-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
              >
                {cycles.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Campaign Objective</label>
              <input type="text" className="glass-input" value={objective} onChange={e => setObjective(e.target.value)} placeholder='e.g. Drive 5M pipeline...' style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => handleStart(false)} className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} disabled={isLoading}>
                {isLoading ? 'Running...' : 'Execute (Dry Run)'}
              </button>
              <button onClick={() => handleStart(true)} className="btn" style={{ flex: 1 }} disabled={isLoading}>
                {isLoading ? 'Running...' : '[live=true] Execute'}
              </button>
            </div>
          </div>
        </div>

        {/* /gtm-agent-run */}
        <div className="glass-card animated-page" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">Workflow & Agent Deep-Dive</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Run a single GTM agent within an active cycle.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>tenant=&lt;id&gt;</label>
              {renderTenantSelector()}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>cycle=&lt;id&gt;</label>
              <select 
                value={cycle} 
                onChange={e => setCycle(e.target.value)} 
                className="glass-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
              >
                {cycles.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>agent=&lt;slug&gt;</label>
              <select 
                value={agent} 
                onChange={e => setAgent(e.target.value)} 
                className="glass-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
              >
                <option value="">-- Select an Agent --</option>
                {DAG_PHASES.map(phase => (
                  <optgroup key={phase.id} label={phase.name}>
                    {phase.agents.map(a => <option key={a} value={a}>{a}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <button onClick={handleAgentRun} className="btn" style={{ marginTop: '1rem', background: 'var(--warning)', color: '#000' }} disabled={isLoading}>
              {isLoading ? 'Running...' : 'Execute Agent'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div style={{ padding: '1rem', borderRadius: '6px', background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: result.success ? 'var(--success)' : 'var(--danger)' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>{result.message}</pre>
        </div>
      )}

    </div>
  );
}

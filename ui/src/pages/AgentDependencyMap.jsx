import { useState, useEffect } from 'react';

const DAG_PHASES = [
  {
    id: 1, name: "Research & Market Intel",
    agents: [
      { slug: 'brief_intake', desc: 'SME Brief and intake requirements gathering.' },
      { slug: 'market_research', desc: 'Competitor profiles and market landscape data.' },
      { slug: 'audience_intelligence', desc: 'Target ICP persona specifications.' },
      { slug: 'keyword_intent', desc: 'Search intent mapping and keyword groupings.' },
      { slug: 'research_synthesis', desc: 'Consolidated research dossier and intelligence deck.' }
    ]
  },
  {
    id: 2, name: "Narrative & Positioning",
    agents: [
      { slug: 'positioning', desc: 'Company core positioning and brand statement.' },
      { slug: 'value_proposition', desc: 'Core value propositions per target segment.' },
      { slug: 'messaging_matrix', desc: 'Persona-specific messaging blocks.' },
      { slug: 'content_pillars', desc: 'Strategic content thematic pillars.' },
      { slug: 'narrative_lock', desc: 'Consolidated GTM messaging narrative lock.' }
    ]
  },
  {
    id: 3, name: "Asset Creation",
    agents: [
      { slug: 'website_copy', desc: 'SEO landing pages and main site copy.' },
      { slug: 'content_assets', desc: 'Ebooks, whitepapers, and guides.' },
      { slug: 'email_sequences', desc: 'Outbound and inbound nurture sequences.' },
      { slug: 'social_content', desc: 'LinkedIn/Twitter organic post plans.' },
      { slug: 'paid_ad_creative', desc: 'Search and social paid ad copy variants.' },
      { slug: 'sales_enablement', desc: 'Pitch decks and one-pagers.' }
    ]
  },
  {
    id: 4, name: "Distribution & Activation",
    agents: [
      { slug: 'channel_strategy', desc: 'Paid, earned, owned channel allocations.' },
      { slug: 'campaign_calendar', desc: '90-day execution calendar.' },
      { slug: 'seo_activation', desc: 'On-page and off-page implementation spec.' },
      { slug: 'paid_media', desc: 'Paid ad platforms bidding and setup instructions.' },
      { slug: 'outbound_partner', desc: 'Partner marketing and cold outbound plans.' },
      { slug: 'community_activation', desc: 'Niche developer/community channels plans.' }
    ]
  },
  {
    id: 5, name: "Measurement & Iteration",
    agents: [
      { slug: 'measurement', desc: 'KPI frameworks and setup parameters.' },
      { slug: 'experiment_review', desc: 'Continuous optimization and A/B checks.' },
      { slug: 'competitive_pulse', desc: 'Continuous competitive telemetry checks.' },
      { slug: 'executive_brief', desc: 'Monthly CMO report compiler.' },
      { slug: 'iteration_planner', desc: 'Next-cycle adaptive backlog selector.' }
    ]
  }
];

export default function AgentDependencyMap() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('_example');
  const [cycle, setCycle] = useState('2026-Q3');
  const [cycles, setCycles] = useState([{ id: '2026-Q3' }]);
  const [outputs, setOutputs] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tenants
  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        setTenants(data.tenants || []);
        if (data.tenants && data.tenants.length > 0) {
          setTenant(data.tenants[0].id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Load cycles for tenant
  useEffect(() => {
    if (!tenant) return;
    fetch(`/api/cycles/${tenant}`)
      .then(res => res.json())
      .then(data => {
        if (data.cycles && data.cycles.length > 0) {
          setCycles(data.cycles);
          setCycle(data.cycles[0].id);
        } else {
          setCycles([{ id: '2026-Q3' }]);
          setCycle('2026-Q3');
        }
      })
      .catch(() => {
        setCycles([{ id: '2026-Q3' }]);
        setCycle('2026-Q3');
      });
  }, [tenant]);

  // Load outputs and pending approvals
  const loadStatusData = async () => {
    if (!tenant || !cycle) return;
    setLoading(true);
    try {
      const outRes = await fetch(`/api/outputs/${tenant}/${cycle}`);
      const outData = await outRes.json();
      setOutputs(outData.outputs || []);

      const pendRes = await fetch('/api/pending');
      const pendData = await pendRes.json();
      // Filter approvals matching this tenant/cycle
      setPendingApprovals((pendData.approvals || []).filter(a => a.tenant === tenant && a.cycle === cycle));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatusData();
  }, [tenant, cycle]);

  const getAgentStatus = (slug) => {
    const isCompleted = outputs.some(o => o.agent === slug || o.file.startsWith(slug));
    if (isCompleted) return 'completed';

    const isPending = pendingApprovals.some(p => p.agent === slug);
    if (isPending) return 'pending';

    return 'not_started';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Completed</span>;
      case 'pending':
        return <span style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Pending Approval</span>;
      default:
        return <span style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.05)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>Not Started</span>;
    }
  };

  return (
    <div className="glass-card animated-page" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 700, margin: 0 }}>Agent Dependency Map</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Data pipeline and state machine showing execution across 27 autonomous marketing agents.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Active Workspace</label>
            <select
              value={tenant}
              onChange={e => setTenant(e.target.value)}
              className="glass-input"
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              {tenants.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Target Cycle</label>
            <select
              value={cycle}
              onChange={e => setCycle(e.target.value)}
              className="glass-input"
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>
          <button className="btn" onClick={loadStatusData} style={{ padding: '0.5rem 1rem', height: 'fit-content', marginTop: '1.25rem', fontSize: '0.85rem' }}>Reload</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Compiling dependency matrix...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {DAG_PHASES.map((phase) => (
            <div key={phase.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600, margin: 0 }}>
                  <span style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>Phase 0{phase.id}:</span>
                  {phase.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{phase.agents.length} Agents</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {phase.agents.map((agent) => {
                  const status = getAgentStatus(agent.slug);
                  return (
                    <div key={agent.slug} style={{
                      padding: '1.25rem',
                      background: status === 'completed' ? 'rgba(16,185,129,0.02)' : (status === 'pending' ? 'rgba(245,158,11,0.02)' : 'rgba(255,255,255,0.01)'),
                      border: `1px solid ${status === 'completed' ? 'rgba(16,185,129,0.15)' : (status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)')}`,
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s',
                      cursor: 'pointer'
                    }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{agent.slug}</span>
                          {getStatusBadge(status)}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
                          {agent.desc}
                        </p>
                      </div>

                      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#666', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '0.75rem' }}>
                        <span>Requires: {phase.id > 1 ? `Phase 0${phase.id - 1}` : 'Objective'}</span>
                        <span>Bus envelope: output.json</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';

export default function AgentDependencyMap() {
  const agents = [
    { id: 1, name: 'Agent 01: GTM AI OS', type: 'Core', desc: 'Central orchestration and context routing.' },
    { id: 2, name: 'Agent 02: Market Research', type: 'Phase 1', desc: 'Analyzes competitors and audience.' },
    { id: 3, name: 'Agent 03: SEO Content', type: 'Phase 2', desc: 'Generates optimized blog articles.' },
    { id: 4, name: 'Agent 04: Social Engine', type: 'Phase 3', desc: 'Creates LinkedIn and Twitter posts.' },
    { id: 5, name: 'Agent 05: Lead Gen', type: 'Phase 4', desc: 'Cold outreach email sequences.' },
    { id: 6, name: 'Agent 06: Brand Validator', type: 'Governance', desc: 'Ensures strict brand voice compliance.' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '2rem', minHeight: '80vh' }}>
      <h2 style={{ marginBottom: '1rem', color: '#eaf1ff' }}>Agent Dependency Map</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        Visualizing the data flow and execution order of the 27 autonomous agents in the active GTM cycle.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        {agents.map((agent) => (
          <div key={agent.id} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#eaf1ff' }}>{agent.name}</h3>
              <span className="status-badge" style={{ backgroundColor: 'rgba(47, 114, 255, 0.15)', color: '#2f72ff' }}>{agent.type}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {agent.desc}
            </p>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.8rem', color: '#999' }}>Outputs to ContextBus</span>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(47, 114, 255, 0.05)', borderRadius: '12px', border: '1px dashed rgba(47, 114, 255, 0.3)' }}>
        <h3 style={{ color: '#2f72ff', marginBottom: '1rem' }}>Data Pipeline (DAG)</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          The output of Phase 1 agents (e.g. Market Research) act as strictly enforced upstream dependencies for Phase 2 agents. Execution halts if dependencies are missing or fail governance.
        </p>
      </div>
    </div>
  );
}

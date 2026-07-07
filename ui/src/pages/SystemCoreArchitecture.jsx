import React from 'react';

export default function SystemCoreArchitecture() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', minHeight: '80vh' }}>
      <h2 style={{ marginBottom: '1rem', color: '#eaf1ff' }}>System Core Architecture</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        High-level overview of the 5-phase Direct Acyclic Graph (DAG) system and the central ContextBus.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        
        {/* Context Bus (Brain) */}
        <div style={{ width: '100%', maxWidth: '800px', padding: '2rem', background: 'rgba(124, 92, 255, 0.05)', border: '1px solid rgba(124, 92, 255, 0.2)', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ color: '#7c5cff', marginBottom: '0.5rem' }}>Central ContextBus</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            The persistent brain of the operating system. It stores the Tenant Profile, Brand Voice, and all intermediate agent outputs. All agents read from and write to the ContextBus.
          </p>
        </div>

        {/* Phase Flow */}
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connector Line */}
          <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          
          {[1, 2, 3, 4, 5].map((phase) => (
            <div key={phase} style={{ position: 'relative', zIndex: 1, padding: '1rem', background: '#03040b', border: '2px solid rgba(47, 114, 255, 0.5)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ color: '#2f72ff', fontWeight: 'bold' }}>Phase</span>
              <span style={{ color: '#eaf1ff', fontSize: '1.2rem' }}>0{phase}</span>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: '800px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)' }}>
            <h4 style={{ color: '#eaf1ff', marginBottom: '0.5rem' }}>Strict Upstream Rules</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Cardinal Rule #3: No agent runs without approved upstream handoffs unless it is an entrypoint. This guarantees data integrity across the pipeline.
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)' }}>
            <h4 style={{ color: '#eaf1ff', marginBottom: '0.5rem' }}>Schema Validation</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Every output written to the ContextBus is strictly validated against a predefined JSON schema before the next phase can access it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

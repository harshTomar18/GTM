import React from 'react';

export default function IntelligenceLayer() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', minHeight: '80vh' }}>
      <h2 style={{ marginBottom: '1rem', color: '#eaf1ff' }}>Shared GTM Intelligence Layer</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        The foundational knowledge base that guarantees brand consistency and strategic alignment across all 27 autonomous agents.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Core Profile */}
        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(47, 114, 255, 0.2)', background: 'linear-gradient(180deg, rgba(47, 114, 255, 0.05) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(47, 114, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', color: '#2f72ff' }}>
              ✦
            </div>
            <h3 style={{ color: '#eaf1ff' }}>Tenant Profile (SME Input)</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            The master YAML configuration containing the company's DNA: target audience, value propositions, key competitors, and product specifications.
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Injected into every agent's prompt context automatically.</li>
            <li>Guarantees zero hallucination on core product features.</li>
            <li>Supports multiple isolated tenant profiles for agency use.</li>
          </ul>
        </div>

        {/* Brand Voice */}
        <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(124, 92, 255, 0.2)', background: 'linear-gradient(180deg, rgba(124, 92, 255, 0.05) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(124, 92, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', color: '#7c5cff' }}>
              ⎈
            </div>
            <h3 style={{ color: '#eaf1ff' }}>Brand Voice & Guardrails</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            A strict set of tone guidelines, banned vocabulary, and reading level requirements enforced universally across all generated content.
          </p>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Enforced by the independent Brand Validator agent.</li>
            <li>Prevents generic "AI-sounding" marketing copy.</li>
            <li>Maintains strict regulatory and compliance standards.</li>
          </ul>
        </div>

      </div>

      {/* Connection Diagram */}
      <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', textAlign: 'center' }}>
        <h4 style={{ color: '#eaf1ff', marginBottom: '1rem' }}>Omnipresent Context Injection</h4>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem' }}>
          Unlike standard LLM tools where you have to repeat instructions, the GTM OS automatically injects the exact relevant sections of the Intelligence Layer into the prompt of every agent, at every stage of the pipeline.
        </p>
      </div>

    </div>
  );
}

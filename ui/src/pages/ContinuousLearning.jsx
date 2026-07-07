import React from 'react';

export default function ContinuousLearning() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', minHeight: '80vh' }}>
      <h2 style={{ marginBottom: '1rem', color: '#eaf1ff' }}>Continuous Learning Loop</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        How human governance feedback permanently improves the AI OS for future cycles.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
        <div style={{ position: 'relative', width: '300px', height: '300px', border: '3px dashed rgba(16, 185, 129, 0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Inner Core */}
          <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid rgba(16, 185, 129, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
            <h3 style={{ color: '#10b981', fontSize: '1.2rem' }}>AI Agent Output</h3>
          </div>

          {/* Orbit Nodes */}
          <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#eaf1ff', fontSize: '0.9rem' }}>
            1. Human Review
          </div>
          
          <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#eaf1ff', fontSize: '0.9rem' }}>
            3. Guidelines Updated
          </div>
          
          <div style={{ position: 'absolute', top: '50%', right: '-60px', transform: 'translateY(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
            2. Rejected<br/><span style={{ fontSize: '0.7rem' }}>with Feedback</span>
          </div>
          
          <div style={{ position: 'absolute', top: '50%', left: '-50px', transform: 'translateY(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', color: '#10b981', fontSize: '0.9rem', textAlign: 'center' }}>
            4. Perfected<br/><span style={{ fontSize: '0.7rem' }}>Auto-Rewrite</span>
          </div>

        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ color: '#eaf1ff', marginBottom: '1rem' }}>Feedback Memory</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          When a human CMO or Legal Reviewer rejects an artifact with comments (e.g., "Too salesy, use softer language"), the system doesn't just rewrite that single artifact. It stores the feedback in the global Tenant Profile, ensuring that <strong>no agent ever makes the same mistake again</strong>. Over time, the AI aligns perfectly with the brand's unique stylistic preferences.
        </p>
      </div>

    </div>
  );
}

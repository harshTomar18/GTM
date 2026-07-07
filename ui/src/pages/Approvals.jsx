import { useState, useEffect } from 'react';

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionResult, setActionResult] = useState(null);
  
  // Explicit inputs matching CLI args
  const [role, setRole] = useState('CMO');
  const [comment, setComment] = useState('Approved for execution');

  useEffect(() => {
    fetch('/api/pending')
      .then(res => res.json())
      .then(data => {
        setApprovals(data.approvals || []);
        setLoading(false);
      });
  }, []);

  const handleAction = async (id, actionType) => {
    setActionResult(null);
    if (!comment) return alert('Enter a comment="..."');

    try {
      const res = await fetch(`/api/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role, comment })
      });
      const data = await res.json();
      setActionResult(data);
      if (data.success) {
        setApprovals(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      setActionResult({ success: false, message: 'Network error.' });
    }
  };

  return (
    <div className="glass-card animated-page" style={{ maxWidth: '800px' }}>
      <div className="card-header">Human Governance</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        AI Executes. Humans Govern. View and resolve pending artifacts at their respective Approval Gates.
      </p>
      
      {actionResult && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '6px', background: actionResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: actionResult.success ? 'var(--success)' : 'var(--danger)' }}>
          {actionResult.message}
        </div>
      )}

      {/* Global Approval Inputs (Mapping to CLI args) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Governance Action Parameters</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gate Owner Role</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              className="glass-input" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
            >
              <option value="CMO">CMO</option>
              <option value="CEO">CEO</option>
              <option value="CFO">CFO</option>
              <option value="SME">SME</option>
              <option value="Legal">Legal</option>
              <option value="SalesLeader">SalesLeader</option>
              <option value="CustomerSuccess">CustomerSuccess</option>
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Feedback / Alignment Notes</label>
            <input type="text" className="glass-input" value={comment} onChange={e => setComment(e.target.value)} placeholder='Provide feedback for the AI...' />
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading pending approvals...</p>
      ) : approvals.length === 0 ? (
        <div style={{ padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--success)', marginBottom: '1rem' }}>All Gates Clear!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No pending tasks require human governance.</p>
        </div>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {approvals.map(app => (
            <li key={app.id} style={{ 
              padding: '1.5rem', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <strong style={{ color: 'white', fontSize: '1.1rem', display: 'block' }}>Artifact: {app.agent}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tenant: {app.tenant} | Cycle: {app.cycle} | &lt;approval_id&gt;: {app.id}</span>
                </div>
                <span className="status-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', height: 'fit-content' }}>Waiting on {app.required_role}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => handleAction(app.id, 'approve')} className="btn" style={{ background: 'var(--success)', flex: 1 }}>
                  Approve (Next Gate)
                </button>
                <button onClick={() => handleAction(app.id, 'reject')} className="btn" style={{ background: 'var(--danger)', flex: 1 }}>
                  Reject (Feedback Loop)
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

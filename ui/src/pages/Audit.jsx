import { useState, useEffect } from 'react';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        setLogs((data.logs || []).reverse());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getEventBadgeStyle = (event) => {
    if (event.includes('approved') || event.includes('complete')) {
      return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    }
    if (event.includes('rejected') || event.includes('failed') || event.includes('escalated')) {
      return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
    }
    if (event.includes('start') || event.includes('initialized')) {
      return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    }
    return { backgroundColor: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.2)' };
  };

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase();
    const eventMatch = (log.event || '').toLowerCase().includes(term);
    const tenantMatch = (log.tenant_id || '').toLowerCase().includes(term);
    const actorMatch = (log.actor || '').toLowerCase().includes(term);
    const commentMatch = (log.rationale || log.comment || '').toLowerCase().includes(term);
    return eventMatch || tenantMatch || actorMatch || commentMatch;
  });

  return (
    <div className="glass-card animated-page" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 700, margin: 0 }}>Immutable Governance Audit Trail</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            System-wide append-only ledger tracking all AI and human marketing operations.
          </p>
        </div>
        <button className="btn" onClick={fetchLogs} style={{ padding: '0.5rem 1.25rem' }}>Refresh Logs</button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Filter audit log by event, tenant, actor, or comment..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="glass-input" 
          style={{ width: '100%', padding: '0.85rem', borderRadius: '8px' }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading audit trail...</p>
      ) : filteredLogs.length === 0 ? (
        <div style={{ padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No matching audit log entries found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'white' }}>
                <th style={{ padding: '1rem' }}>Timestamp</th>
                <th style={{ padding: '1rem' }}>Event Type</th>
                <th style={{ padding: '1rem' }}>Tenant</th>
                <th style={{ padding: '1rem' }}>Actor</th>
                <th style={{ padding: '1rem' }}>Subject ID</th>
                <th style={{ padding: '1rem' }}>Comments / Rationale</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                    {new Date(log.ts).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      ...getEventBadgeStyle(log.event)
                    }}>
                      {log.event}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#fff' }}>
                    {log.tenant_id}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{log.actor}</div>
                    <div style={{ fontSize: '0.72rem', color: '#666' }}>{log.actor_role}</div>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.subject_id}
                  </td>
                  <td style={{ padding: '1rem', maxWidth: '300px', wordBreak: 'break-word', color: log.rationale || log.comment ? '#a5b4fc' : '#666' }}>
                    {log.rationale || log.comment || (log.after && JSON.stringify(log.after)) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

export default function Dashboard({ tenants }) {
  const [targetTenant, setTargetTenant] = useState('_example');
  const [dashboardText, setDashboardText] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrueDashboard = async () => {
    if (!targetTenant) return;
    setIsLoading(true);
    setDashboardText(null);
    try {
      const res = await fetch(`/api/dashboard/${targetTenant}`);
      const data = await res.json();
      setDashboardText(data);
    } catch (e) {
      setDashboardText({ success: false, message: 'Network error.' });
    }
    setIsLoading(false);
  };

  return (
    <div className="animated-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Row 1: Welcome Banner & Active Registry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Welcome & Quickstart Guide */}
        <div className="glass-card animated-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2rem', height: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', color: 'white', marginBottom: '0.5rem', fontWeight: 700 }}>Executive Overview</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Your end-to-end AI Marketing Department. Follow these 3 simple phases:
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ fontSize: '1.25rem' }}>1️⃣</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>SME Input:</strong> Fill in workspace target profile.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ fontSize: '1.25rem' }}>2️⃣</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Workflow:</strong> Run the 27 AI marketing agents.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ fontSize: '1.25rem' }}>3️⃣</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Governance:</strong> Approve marketing assets.</div>
            </div>
          </div>
        </div>

        {/* Tenants Card */}
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">Active Tenants Registry</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Active workspaces discovered on this system:</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px', marginBottom: '1rem' }}>
            {tenants.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No tenants found. Initialize one in Onboarding.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tenants.map(t => (
                  <li key={t.id} style={{ 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.id}</span>
                    <span className="status-badge" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>Active</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>💡 Set active workspace from the dropdown below to run workflows.</div>
        </div>

      </div>

      {/* Row 2: Analytics & Phase progress control */}
      <div className="glass-card animated-page" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">Advanced: View Raw AI Logs (/gtm-dashboard)</div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Fetch the detailed, text-based cycle status generated directly by the underlying AI Operating System.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '220px', maxWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.85rem' }}>Company / Workspace Name</label>
            {tenants.length > 0 ? (
              <select 
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
              >
                {tenants.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            ) : (
              <input 
                type="text" 
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
                placeholder="e.g. acme_corp"
                className="glass-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
              />
            )}
          </div>
          <button 
            className="btn" 
            onClick={fetchTrueDashboard}
            disabled={isLoading}
            style={{ height: '42px', padding: '0 1.5rem' }}
          >
            {isLoading ? 'Fetching...' : 'Get Dashboard'}
          </button>
        </div>

        {dashboardText && dashboardText.success && dashboardText.metrics && (() => {
          const metrics = dashboardText.metrics;
          return (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Stats Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px' }}>
                  <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CAMPAIGN STATUS</div>
                  <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{metrics.status === 'Active' ? 'Active 🟢' : 'Initialized ⚙️'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Cycle: {metrics.cycle}</div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                  <div style={{ color: '#a7f3d0', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CURRENT PHASE</div>
                  <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>
                    {metrics.phase5Progress > 0 ? 'Phase 5 / 5' : (metrics.phase4Progress > 0 ? 'Phase 4 / 5' : (metrics.phase3Progress > 0 ? 'Phase 3 / 5' : (metrics.phase2Progress > 0 ? 'Phase 2 / 5' : 'Phase 1 / 5')))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {metrics.phase5Progress > 0 ? 'Measurement & Optimization' : (metrics.phase4Progress > 0 ? 'Distribution & Activation' : (metrics.phase3Progress > 0 ? 'Asset Creation' : (metrics.phase2Progress > 0 ? 'Positioning locked' : 'Researching market')))}
                  </div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px' }}>
                  <div style={{ color: '#fde047', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>DELIVERABLES</div>
                  <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{metrics.deliverablesCount} Generated</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>AI output assets on disk</div>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(124,92,255,0.04)', border: '1px solid rgba(124,92,255,0.15)', borderRadius: '10px' }}>
                  <div style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>GOVERNANCE GATES</div>
                  <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>
                    {metrics.pendingApprovals > 0 ? `${metrics.pendingApprovals} Pending ⚠️` : 'Clear ✅'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {metrics.pendingApprovals > 0 ? 'Reviews waiting' : 'No gates blocked'}
                  </div>
                </div>
              </div>

              {/* Campaign Phase Progress Timeline */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.5rem' }}>
                <h4 style={{ color: 'white', fontSize: '0.95rem', margin: '0 0 1.25rem 0' }}>📋 Execution Phase Progress</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phase 1: Research & Market Intel</span>
                    <span style={{ color: metrics.phase1Progress === 100 ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{metrics.phase1Progress}% {metrics.phase1Progress === 100 ? 'Completed' : 'Processing'}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.phase1Progress}%`, height: '100%', background: metrics.phase1Progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phase 2: Narrative & Positioning</span>
                    <span style={{ color: metrics.phase2Progress === 100 ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{metrics.phase2Progress}% {metrics.phase2Progress === 100 ? 'Completed' : (metrics.phase2Progress > 0 ? 'Processing' : 'Pending')}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.phase2Progress}%`, height: '100%', background: metrics.phase2Progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phase 3: Digital Asset Creation</span>
                    <span style={{ color: metrics.phase3Progress === 100 ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{metrics.phase3Progress}% {metrics.phase3Progress === 100 ? 'Completed' : (metrics.phase3Progress > 0 ? 'Processing' : 'Pending')}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.phase3Progress}%`, height: '100%', background: metrics.phase3Progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phase 4: Distribution & Activation</span>
                    <span style={{ color: metrics.phase4Progress === 100 ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{metrics.phase4Progress}% {metrics.phase4Progress === 100 ? 'Completed' : (metrics.phase4Progress > 0 ? 'Processing' : 'Pending')}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.phase4Progress}%`, height: '100%', background: metrics.phase4Progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phase 5: Measurement & Iteration</span>
                    <span style={{ color: metrics.phase5Progress === 100 ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{metrics.phase5Progress}% {metrics.phase5Progress === 100 ? 'Completed' : (metrics.phase5Progress > 0 ? 'Processing' : 'Pending')}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.phase5Progress}%`, height: '100%', background: metrics.phase5Progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {dashboardText && !dashboardText.success && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '6px', 
            background: 'rgba(239,68,68,0.05)', 
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.9rem'
          }}>
            Failed to load dashboard metrics. Network or server error.
          </div>
        )}
      </div>
    </div>
  );
}

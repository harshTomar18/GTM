import { useState, useEffect } from 'react';

export default function ContinuousLearning() {
  const [stats, setStats] = useState({
    rejections: 0,
    approvals: 0,
    escalations: 0,
    totalLoops: 0,
    rejectionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.logs) {
          let rejections = 0;
          let approvals = 0;
          let escalations = 0;

          data.logs.forEach(log => {
            if (log.event === 'approval.decision') {
              if (log.after && log.after.status === 'approved') approvals++;
              if (log.after && log.after.status === 'rejected') rejections++;
            }
            if (log.event === 'approval.escalated') {
              escalations++;
              rejections++; // count escalation as a rejection event
            }
          });

          const totalLoops = approvals + rejections;
          const rejectionRate = totalLoops > 0 ? Math.round((rejections / totalLoops) * 100) : 0;

          setStats({
            rejections,
            approvals,
            escalations,
            totalLoops,
            rejectionRate
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card animated-page" style={{ padding: '2.5rem' }}>
      <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 700, margin: 0 }}>Continuous Learning Loop</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem', marginBottom: '2.5rem' }}>
        How human governance feedback permanently improves the GTM AI Engine for future cycles.
      </p>

      {/* Row 1: Real-time Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ color: '#a7f3d0', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>APPROVED ARTIFACTS</div>
          <div style={{ fontSize: '2.25rem', color: '#10b981', fontWeight: 'bold' }}>{loading ? '...' : stats.approvals}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Moved to GTM Production</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>REVISION LOOPS</div>
          <div style={{ fontSize: '2.25rem', color: '#ef4444', fontWeight: 'bold' }}>{loading ? '...' : stats.rejections}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Rejections & Redos</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ color: '#fde047', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>REJECTION RATE</div>
          <div style={{ fontSize: '2.25rem', color: '#fff', fontWeight: 'bold' }}>{loading ? '...' : `${stats.rejectionRate}%`}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Rejection percentage</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'rgba(124,92,255,0.04)', border: '1px solid rgba(124,92,255,0.15)', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AUTO-ESCALATIONS</div>
          <div style={{ fontSize: '2.25rem', color: '#8b5cf6', fontWeight: 'bold' }}>{loading ? '...' : stats.escalations}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Escalated directly to CEO</div>
        </div>
      </div>

      {/* Row 2: Graph & Description */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
        
        {/* Animated Loop Diagram */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '280px', height: '280px', border: '3px dashed rgba(16, 185, 129, 0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Inner Core */}
            <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid rgba(16, 185, 129, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
              <h3 style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: 700 }}>AI Agent Output</h3>
            </div>

            {/* Orbit Nodes */}
            <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#eaf1ff', fontSize: '0.85rem', fontWeight: 600 }}>
              1. Human Review
            </div>
            
            <div style={{ position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#03040b', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#eaf1ff', fontSize: '0.85rem', fontWeight: 600 }}>
              3. Guidelines Updated
            </div>
            
            <div style={{ position: 'absolute', top: '50%', right: '-55px', transform: 'translateY(-50%)', background: '#03040b', padding: '0.5rem 1.25rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
              2. Rejected<br/><span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>with Feedback</span>
            </div>
            
            <div style={{ position: 'absolute', top: '50%', left: '-55px', transform: 'translateY(-50%)', background: '#03040b', padding: '0.5rem 1.25rem', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', color: '#10b981', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
              4. Perfected<br/><span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>Auto-Rewrite</span>
            </div>
          </div>
        </div>

        {/* Text Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <h4 style={{ color: 'white', fontSize: '1rem', margin: '0 0 0.75rem 0', fontWeight: 600 }}>🔄 Revision Feedback Memory</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
              When a reviewer (e.g. CMO or Legal Specialist) rejects an output with instructions, the comments are stored in the workspace's memory stack. The agent uses this log as context for its next run, executing an automatic correction loop.
            </p>
          </div>
          <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <h4 style={{ color: 'white', fontSize: '1rem', margin: '0 0 0.75rem 0', fontWeight: 600 }}>⚠️ Escalation Limit Guardrail</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
              To prevent infinite revision loops, GTM governance enforces a maximum of 3 iterations. If the artifact fails review three times, the system escalates the ticket directly to the CEO for a final bypass or overriding alignment.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

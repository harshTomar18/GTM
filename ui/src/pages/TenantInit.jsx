import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TenantInit() {
  const [tenant, setTenant] = useState('');
  const [pack, setPack] = useState('_template');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/tenant-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, pack })
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        // Redirect to the professional Profile Editor page!
        navigate(`/onboarding/editor/${tenant}`);
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to connect to backend' });
    }
    setIsLoading(false);
  };

  const handleLoadExisting = () => {
    if (!tenant) return alert('Please enter a Company / Workspace ID first.');
    navigate(`/onboarding/editor/${tenant}`);
  };

  const handleValidate = async () => {
    if (!tenant) return alert('Enter a Company / Workspace ID first.');
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/validate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, message: 'Network error.' });
    }
    setIsLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }} className="animated-page">
      
      {/* Onboarding setup card */}
      <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🚀</span>
          <h2 style={{ fontSize: '1.75rem', color: '#eaf1ff', marginTop: '1rem', fontWeight: 700 }}>Company Onboarding</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Initialize or load a marketing workspace to get started.
          </p>
        </div>

        <form onSubmit={handleInit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Company / Workspace ID</label>
            <input 
              type="text" 
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="e.g. microsoft, acme"
              required
              className="glass-input"
              style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Vertical / Industry Pack</label>
            <input 
              type="text" 
              value={pack}
              onChange={(e) => setPack(e.target.value)}
              placeholder="e.g. _template"
              required
              className="glass-input"
              style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', fontSize: '1rem' }}
            />
          </div>

          {result && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: result.success ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
              {result.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn" disabled={isLoading} style={{ flex: 1, padding: '0.85rem', fontWeight: 600, fontSize: '0.95rem' }}>
              {isLoading ? 'Running...' : 'Initialize Workspace'}
            </button>
            <button type="button" onClick={handleLoadExisting} className="btn" style={{ flex: 1, padding: '0.85rem', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.95rem' }}>
              Load Existing
            </button>
          </div>
        </form>
      </div>

      {/* Validation Tools Card */}
      <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <div>
          <h3 style={{ color: '#eaf1ff', fontSize: '1.4rem', marginBottom: '0.75rem', fontWeight: 700 }}>⚙️ Quick Diagnostics</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Validate workspace settings against GTM OS schema rules. This diagnostics layer checks required profile values, legal guidelines, and output directories.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          <button onClick={handleValidate} className="btn" disabled={isLoading} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600 }}>
            {isLoading ? 'Running...' : 'Run Diagnostics Check'}
          </button>
        </div>
      </div>

    </div>
  );
}

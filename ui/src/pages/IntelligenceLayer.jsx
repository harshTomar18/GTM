import { useState, useEffect } from 'react';

export default function IntelligenceLayer() {
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState('_example');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load tenants list
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

  // Fetch target profile details
  const loadProfile = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant-profile/${tenant}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [tenant]);

  return (
    <div className="glass-card animated-page" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 700, margin: 0 }}>GTM Intelligence Layer</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Omnipresent brand identity configuration automatically injected into every agent prompt.
          </p>
        </div>

        {/* Tenant selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>View Workspace Profile</label>
          <select 
            value={tenant} 
            onChange={e => setTenant(e.target.value)} 
            className="glass-input"
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            {tenants.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading intelligence schema...</p>
      ) : !profile ? (
        <p style={{ color: 'var(--danger)' }}>Profile not loaded.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Card 1: Core Company Parameters */}
          <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              🏢 Company Parameters
            </h3>
            
            <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white', width: '40%' }}>Legal Name:</td>
                  <td style={{ padding: '0.5rem 0' }}>{profile.company?.legal_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Brand Name:</td>
                  <td style={{ padding: '0.5rem 0' }}>{profile.company?.brand_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Primary Motion:</td>
                  <td style={{ padding: '0.5rem 0', textTransform: 'capitalize' }}>{profile.lob?.[0]?.motion?.replace('_', ' ') || 'Enterprise ABM'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>HQ Country:</td>
                  <td style={{ padding: '0.5rem 0' }}>{profile.company?.hq_country || 'US'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Size Band:</td>
                  <td style={{ padding: '0.5rem 0', textTransform: 'capitalize' }}>{profile.company?.size_band?.replace('_', ' ') || 'Mid Market'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Industry:</td>
                  <td style={{ padding: '0.5rem 0' }}>{profile.industry?.primary || 'B2B Software'}</td>
                </tr>
              </tbody>
            </table>
            
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.4rem' }}>Executive Description:</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {profile.company?.description_long || profile.company?.description_short || 'No description configured.'}
              </p>
            </div>
          </div>

          {/* Card 2: Brand Voice & Guardrails */}
          <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              📣 Brand Voice
            </h3>
            
            <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white', width: '40%' }}>Voice Archetype:</td>
                  <td style={{ padding: '0.5rem 0' }}>{profile.brand_voice?.archetype || 'Sage'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Reading Level:</td>
                  <td style={{ padding: '0.5rem 0', textTransform: 'capitalize' }}>{profile.brand_voice?.reading_level?.replace('_', ' ') || 'Grade 10'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'white' }}>Tonal Pillars:</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {profile.brand_voice?.tone ? profile.brand_voice.tone.join(', ') : 'Practical, clear'}
                  </td>
                </tr>
              </tbody>
            </table>

            {profile.brand_voice?.banned_phrases && profile.brand_voice.banned_phrases.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>🚫 Banned Phrases (Auto-Redo Triggers):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {profile.brand_voice.banned_phrases.map((p, i) => (
                    <span key={i} style={{ 
                      padding: '0.2rem 0.5rem', 
                      background: 'rgba(239, 68, 68, 0.05)', 
                      border: '1px solid rgba(239, 68, 68, 0.15)', 
                      color: '#fca5a5', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem' 
                    }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Targeted ICP & Markets */}
          <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'white', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              🎯 Target ICP Specs
            </h3>

            {profile.icp_archetypes && profile.icp_archetypes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {profile.icp_archetypes.map((icp, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{icp.id?.replace('_', ' ').toUpperCase()}</div>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '0.25rem 0', width: '40%' }}>Industries:</td>
                          <td style={{ padding: '0.25rem 0' }}>{icp.industries ? icp.industries.join(', ') : 'Tech'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0.25rem 0' }}>Company Sizes:</td>
                          <td style={{ padding: '0.25rem 0' }}>{icp.company_size ? icp.company_size.join(', ') : 'All'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0.25rem 0' }}>Economic Buyer:</td>
                          <td style={{ padding: '0.25rem 0', color: '#a5b4fc' }}>{icp.buying_committee?.economic_buyer || 'VP Finance'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No ICP profiles configured.</p>
            )}

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.4rem' }}>Authority Frameworks:</div>
              {profile.frameworks && profile.frameworks.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {profile.frameworks.map((f, i) => (
                    <span key={i} style={{ padding: '0.2rem 0.5rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#666' }}>None (Standard claims check only)</span>
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

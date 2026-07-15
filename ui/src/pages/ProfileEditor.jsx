import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProfileEditor() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [rawYaml, setRawYaml] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('visual'); // 'visual' or 'advanced'
  const [result, setResult] = useState(null);
  const [newFramework, setNewFramework] = useState('');

  const loadProfile = async () => {
    setIsProfileLoading(true);
    try {
      const res = await fetch(`/api/tenant-profile/${tenantId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setRawYaml(data.rawYaml || '');
      } else {
        setResult({ success: false, message: 'Profile details not found' });
      }
    } catch (e) {
      setResult({ success: false, message: 'Failed to load profile details' });
    }
    setIsProfileLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      loadProfile();
    }
  }, [tenantId]);

  const saveProfileVisual = async (updatedProfile) => {
    setIsProfileLoading(true);
    try {
      const res = await fetch(`/api/tenant-profile/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile })
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        alert('Details saved successfully! Redirecting to campaign manager...');
        navigate('/cycles');
      }
    } catch (e) {
      setResult({ success: false, message: 'Failed to save profile details' });
    }
    setIsProfileLoading(false);
  };

  const saveProfileAdvanced = async () => {
    setIsProfileLoading(true);
    try {
      const res = await fetch(`/api/tenant-profile/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawYaml })
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        alert('YAML saved successfully! Redirecting to campaign manager...');
        navigate('/cycles');
      }
    } catch (e) {
      setResult({ success: false, message: 'Failed to save profile' });
    }
    setIsProfileLoading(false);
  };

  const handleVisualChange = (section, field, value) => {
    const updated = { ...profile };
    if (section) {
      updated[section] = { ...updated[section], [field]: value };
    } else {
      updated[field] = value;
    }
    setProfile(updated);
  };

  if (isProfileLoading && !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#fff' }}>
        <h2>Loading Workspace Profile...</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animated-page">
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.5rem 2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <button onClick={() => navigate('/onboarding')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ← Back to Setup
          </button>
          <h2 style={{ color: '#eaf1ff', margin: 0 }}>Company Workspace: {tenantId}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '6px' }}>
          <button
            onClick={() => setActiveEditorTab('visual')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: activeEditorTab === 'visual' ? 'var(--accent)' : 'transparent', color: activeEditorTab === 'visual' ? '#000' : '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            🛠️ Visual Form
          </button>
          <button
            onClick={() => setActiveEditorTab('advanced')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: activeEditorTab === 'advanced' ? 'var(--accent)' : 'transparent', color: activeEditorTab === 'advanced' ? '#000' : '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            📝 Raw YAML
          </button>
        </div>
      </div>

      {profile && (
        <div className="glass-card">
          {activeEditorTab === 'visual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Section 1: Company details */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>🏢 Company Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Legal Name</label>
                    <input
                      type="text"
                      value={profile.company?.legal_name || ''}
                      onChange={e => handleVisualChange('company', 'legal_name', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Brand Name</label>
                    <input
                      type="text"
                      value={profile.company?.brand_name || ''}
                      onChange={e => handleVisualChange('company', 'brand_name', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Website URL</label>
                    <input
                      type="text"
                      value={profile.company?.url || ''}
                      onChange={e => handleVisualChange('company', 'url', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Company Size</label>
                    <select
                      value={profile.company?.size_band || 'smb'}
                      onChange={e => handleVisualChange('company', 'size_band', e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '0.75rem', color: '#fff', background: 'var(--bg-primary)' }}
                    >
                      <option value="smb">Small / Medium Business (SMB)</option>
                      <option value="mid_market">Mid-Market</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Short Description</label>
                  <input
                    type="text"
                    value={profile.company?.description_short || ''}
                    onChange={e => handleVisualChange('company', 'description_short', e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Long Description</label>
                  <textarea
                    value={profile.company?.description_long || ''}
                    onChange={e => handleVisualChange('company', 'description_long', e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', height: '100px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Section 2: Brand Voice */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>📢 Brand Voice & Content Guardrails</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Voice Archetype</label>
                    <input
                      type="text"
                      value={profile.brand_voice?.archetype || 'Sage'}
                      onChange={e => handleVisualChange('brand_voice', 'archetype', e.target.value)}
                      placeholder="e.g. Sage, Creator, Explorer"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Reading Level</label>
                    <input
                      type="text"
                      value={profile.brand_voice?.reading_level || 'grade_11'}
                      onChange={e => handleVisualChange('brand_voice', 'reading_level', e.target.value)}
                      placeholder="e.g. grade_10, grade_12"
                      className="glass-input"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Banned Phrases (Comma Separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(profile.brand_voice?.banned_phrases) ? profile.brand_voice.banned_phrases.join(', ') : ''}
                    onChange={e => handleVisualChange('brand_voice', 'banned_phrases', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="e.g. revolutionary, cutting-edge, synergy"
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Section 3: Tech Stack */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>⚙️ Tech Stack Integration</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>CRM System</label>
                    <input
                      type="text"
                      value={profile.tech_stack?.crm || ''}
                      onChange={e => handleVisualChange('tech_stack', 'crm', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Social Media Channel</label>
                    <input
                      type="text"
                      value={profile.tech_stack?.social || ''}
                      onChange={e => handleVisualChange('tech_stack', 'social', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Industry & Market Details */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>🌐 Market & Industry Focus</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Primary Industry</label>
                    <input
                      type="text"
                      value={profile.industry?.primary || ''}
                      onChange={e => handleVisualChange('industry', 'primary', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Target Markets (Comma Separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(profile.geography?.primary_markets) ? profile.geography.primary_markets.join(', ') : ''}
                      onChange={e => handleVisualChange('geography', 'primary_markets', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="e.g. US, CA, UK"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Default Language</label>
                    <input
                      type="text"
                      value={profile.languages?.default || 'en-US'}
                      onChange={e => handleVisualChange('languages', 'default', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Currency</label>
                    <input
                      type="text"
                      value={profile.currency?.default || 'USD'}
                      onChange={e => handleVisualChange('currency', 'default', e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4.5: Lines of Business & Frameworks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* LOBs Editor */}
                <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', margin: 0 }}>💼 Lines of Business (LOB)</h3>
                    <button type="button" onClick={() => {
                      const updated = [...(profile.lob || [])];
                      updated.push({ id: `lob_${updated.length + 1}`, motion: 'enterprise_abm', weight: 1.0 });
                      handleVisualChange(null, 'lob', updated);
                    }} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>+ Add LOB</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(profile.lob || []).map((lobItem, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>LOB ID</label>
                          <input
                            type="text"
                            value={lobItem.id || ''}
                            onChange={e => {
                              const updated = [...profile.lob];
                              updated[idx] = { ...updated[idx], id: e.target.value };
                              handleVisualChange(null, 'lob', updated);
                            }}
                            className="glass-input"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div style={{ flex: 1.5 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>GTM Motion</label>
                          <select
                            value={lobItem.motion || 'enterprise_abm'}
                            onChange={e => {
                              const updated = [...profile.lob];
                              updated[idx] = { ...updated[idx], motion: e.target.value };
                              handleVisualChange(null, 'lob', updated);
                            }}
                            className="glass-input"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', color: '#fff', background: 'var(--bg-primary)' }}
                          >
                            <option value="enterprise_abm">Enterprise ABM</option>
                            <option value="plg">PLG (Product Led Growth)</option>
                            <option value="hybrid">Hybrid Motion</option>
                            <option value="channel_partner">Channel Partner</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = profile.lob.filter((_, i) => i !== idx);
                          handleVisualChange(null, 'lob', updated);
                        }} style={{ marginTop: '1.25rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frameworks Editor */}
                <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>🛡️ Authority Frameworks</h3>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <input
                      type="text"
                      placeholder="e.g. SOC2, HIPAA, ISO27001"
                      value={newFramework}
                      onChange={e => setNewFramework(e.target.value)}
                      className="glass-input"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
                    />
                    <button type="button" onClick={() => {
                      if (!newFramework) return;
                      const updated = [...(profile.frameworks || [])];
                      if (!updated.includes(newFramework)) {
                        updated.push(newFramework);
                        handleVisualChange(null, 'frameworks', updated);
                      }
                      setNewFramework('');
                    }} className="btn" style={{ padding: '0 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Add</button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(profile.frameworks || []).map((f) => (
                      <span key={f} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {f}
                        <span onClick={() => {
                          const updated = profile.frameworks.filter(item => item !== f);
                          handleVisualChange(null, 'frameworks', updated);
                        }} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>×</span>
                      </span>
                    ))}
                    {(profile.frameworks || []).length === 0 && (
                      <span style={{ fontSize: '0.85rem', color: '#555' }}>No frameworks configured. Add one above.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Target Buyer Personas (ICP) */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', margin: 0 }}>🎯 Target Personas (ICP)</h3>
                  <button type="button" onClick={() => {
                    const updated = [...(profile.icp_archetypes || [])];
                    updated.push({
                      id: `persona_${updated.length + 1}`,
                      company_size: ['100-1000'],
                      geos: ['US'],
                      buying_committee: { economic_buyer: 'CMO', technical_buyer: 'CTO', user_buyer: 'Director' }
                    });
                    handleVisualChange(null, 'icp_archetypes', updated);
                  }} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>+ Add Persona</button>
                </div>

                {profile.icp_archetypes?.map((icp, index) => (
                  <div key={index} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>Persona #{index + 1}</span>
                      <button type="button" onClick={() => {
                        const updated = profile.icp_archetypes.filter((_, idx) => idx !== index);
                        handleVisualChange(null, 'icp_archetypes', updated);
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>Delete Persona</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Persona ID</label>
                        <input
                          type="text"
                          value={icp.id || ''}
                          onChange={e => {
                            const updatedList = [...profile.icp_archetypes];
                            updatedList[index] = { ...updatedList[index], id: e.target.value };
                            handleVisualChange(null, 'icp_archetypes', updatedList);
                          }}
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Company Size Target</label>
                        <input
                          type="text"
                          value={Array.isArray(icp.company_size) ? icp.company_size.join(', ') : ''}
                          onChange={e => {
                            const updatedList = [...profile.icp_archetypes];
                            updatedList[index] = { ...updatedList[index], company_size: e.target.value.split(',').map(s => s.trim()) };
                            handleVisualChange(null, 'icp_archetypes', updatedList);
                          }}
                          className="glass-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Economic Buyer</label>
                        <input
                          type="text"
                          value={icp.buying_committee?.economic_buyer || ''}
                          onChange={e => {
                            const updatedList = [...profile.icp_archetypes];
                            updatedList[index] = {
                              ...updatedList[index],
                              buying_committee: { ...updatedList[index].buying_committee, economic_buyer: e.target.value }
                            };
                            handleVisualChange(null, 'icp_archetypes', updatedList);
                          }}
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Technical Buyer</label>
                        <input
                          type="text"
                          value={icp.buying_committee?.technical_buyer || ''}
                          onChange={e => {
                            const updatedList = [...profile.icp_archetypes];
                            updatedList[index] = {
                              ...updatedList[index],
                              buying_committee: { ...updatedList[index].buying_committee, technical_buyer: e.target.value }
                            };
                            handleVisualChange(null, 'icp_archetypes', updatedList);
                          }}
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>User Buyer</label>
                        <input
                          type="text"
                          value={icp.buying_committee?.user_buyer || ''}
                          onChange={e => {
                            const updatedList = [...profile.icp_archetypes];
                            updatedList[index] = {
                              ...updatedList[index],
                              buying_committee: { ...updatedList[index].buying_committee, user_buyer: e.target.value }
                            };
                            handleVisualChange(null, 'icp_archetypes', updatedList);
                          }}
                          className="glass-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 6: Approval Roles & Stakeholders */}
              <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', margin: 0 }}>👥 Key Stakeholders & Approvers</h3>
                  <button type="button" onClick={() => {
                    const updated = [...(profile.approval_roles || [])];
                    updated.push({
                      role: 'SME',
                      name: 'Approver Name',
                      email: 'approver@company.com',
                      scope: ['technical_claims']
                    });
                    handleVisualChange(null, 'approval_roles', updated);
                  }} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>+ Add Stakeholder</button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Define the names, emails, and positions of the internal stakeholders who will review and approve AI-generated marketing campaigns.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {profile.approval_roles?.map((roleInfo, idx) => (
                    <div key={idx} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <select
                          value={roleInfo.role || 'SME'}
                          onChange={e => {
                            const updatedList = [...profile.approval_roles];
                            updatedList[idx] = { ...updatedList[idx], role: e.target.value };
                            handleVisualChange(null, 'approval_roles', updatedList);
                          }}
                          className="glass-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                        >
                          <option value="CMO">CMO</option>
                          <option value="CEO">CEO</option>
                          <option value="CFO">CFO</option>
                          <option value="SME">SME</option>
                          <option value="Legal">Legal</option>
                          <option value="SalesLeader">Sales Leader</option>
                          <option value="CustomerSuccess">Customer Success</option>
                        </select>

                        <button type="button" onClick={() => {
                          const updated = profile.approval_roles.filter((_, i) => i !== idx);
                          handleVisualChange(null, 'approval_roles', updated);
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Delete</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Name</label>
                          <input
                            type="text"
                            value={roleInfo.name || ''}
                            onChange={e => {
                              const updatedList = [...profile.approval_roles];
                              updatedList[idx] = { ...updatedList[idx], name: e.target.value };
                              handleVisualChange(null, 'approval_roles', updatedList);
                            }}
                            className="glass-input"
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Email Address</label>
                          <input
                            type="email"
                            value={roleInfo.email || ''}
                            onChange={e => {
                              const updatedList = [...profile.approval_roles];
                              updatedList[idx] = { ...updatedList[idx], email: e.target.value };
                              handleVisualChange(null, 'approval_roles', updatedList);
                            }}
                            className="glass-input"
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={() => saveProfileVisual(profile)} className="btn" disabled={isProfileLoading} style={{ background: '#10b981', color: '#000', padding: '0.75rem 2rem', fontWeight: 600 }}>
                  {isProfileLoading ? 'Saving...' : '💾 Save details & Start campaign'}
                </button>
                {result && (
                  <span style={{ color: result.success ? 'var(--success)' : 'var(--danger)' }}>{result.message}</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                value={rawYaml}
                onChange={(e) => setRawYaml(e.target.value)}
                className="glass-input"
                style={{
                  width: '100%',
                  height: '500px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.4)',
                  color: 'var(--accent)',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={saveProfileAdvanced} className="btn" disabled={isProfileLoading} style={{ padding: '0.75rem 2rem', fontWeight: 600 }}>
                  {isProfileLoading ? 'Saving...' : '💾 Save YAML & Start campaign'}
                </button>
                {result && (
                  <span style={{ color: result.success ? 'var(--success)' : 'var(--danger)' }}>{result.message}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

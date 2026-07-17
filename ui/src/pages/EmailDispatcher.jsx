import { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, FileText, UserCheck, Loader, Calendar } from 'lucide-react';
import { normalizePayloadKeys } from '../components/Renderers';

const ALL_AGENTS = [
  { id: 'brief_intake', name: 'Brief Intake' },
  { id: 'market_research', name: 'Market Research' },
  { id: 'audience_intelligence', name: 'Audience Intelligence' },
  { id: 'keyword_intent', name: 'Keyword Intent' },
  { id: 'research_synthesis', name: 'Research Synthesis' },
  { id: 'positioning', name: 'Positioning Statement' },
  { id: 'value_proposition', name: 'Value Proposition Set' },
  { id: 'messaging_matrix', name: 'Messaging Matrix' },
  { id: 'content_pillars', name: 'Content Pillar Set' },
  { id: 'narrative_lock', name: 'Narrative Lock Doc' },
  { id: 'website_copy', name: 'Website Copy Pack' },
  { id: 'content_assets', name: 'Content Asset Pack' },
  { id: 'email_sequences', name: 'Email Sequence Pack' },
  { id: 'social_content', name: 'Social Content Pack' },
  { id: 'paid_ad_creative', name: 'Paid Ad Creative Pack' },
  { id: 'sales_enablement', name: 'Sales Enablement Pack' },
  { id: 'channel_strategy', name: 'Channel Plan' },
  { id: 'campaign_calendar', name: 'Campaign Calendar' },
  { id: 'seo_activation', name: 'SEO Activation Pack' },
  { id: 'paid_media', name: 'Paid Media Setup Pack' },
  { id: 'outbound_partner', name: 'Outbound Partner Pack' },
  { id: 'community_activation', name: 'Community Activation Pack' },
  { id: 'measurement', name: 'KPI Framework' },
  { id: 'experiment_review', name: 'Experiment' },
  { id: 'competitive_pulse', name: 'Competitor Profile' },
  { id: 'executive_brief', name: 'Executive Brief' },
  { id: 'iteration_planner', name: 'Iteration Planner' }
];

export default function EmailDispatcher({ tenants = [] }) {
  const [selectedTenant, setSelectedTenant] = useState(tenants.length > 0 ? tenants[0].id : '_example');
  const [selectedCycle, setSelectedCycle] = useState('2026-Q3');
  const [selectedAgent, setSelectedAgent] = useState('email_sequences');
  
  // Company details for token replacement
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');

  // Dynamic list of stakeholders
  const [stakeholders, setStakeholders] = useState([]);
  
  // Checklist State: keeps track of which roles are selected
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  // Emails map: role -> custom editable email string
  const [emailsMap, setEmailsMap] = useState({});
  const [namesMap, setNamesMap] = useState({});
  
  const [agentOutput, setAgentOutput] = useState(null);
  
  // Sub-items list extraction (for sequences / ad variants)
  const [subItems, setSubItems] = useState([]);
  const [selectedSubItemIndex, setSelectedSubItemIndex] = useState(0);

  // Custom message overrides
  const [customSubject, setCustomSubject] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  
  // UI Status
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch stakeholder roles & generated outputs
  useEffect(() => {
    if (!selectedTenant) return;
    setIsLoading(true);
    setResult(null);
    setAgentOutput(null);
    setSubItems([]);
    setSelectedSubItemIndex(0);
    
    // Clear list inputs immediately
    setStakeholders([]);
    setSelectedRoles([]);
    setEmailsMap({});
    setNamesMap({});

    // 1. Fetch Company profile details
    fetch(`/api/tenant-profile/${selectedTenant}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          const profile = data.profile;
          setCompanyName(profile.company?.brand_name || selectedTenant);
          setCompanyIndustry(profile.industry?.primary || 'B2B SaaS');

          const roles = profile.approval_roles || [];
          setStakeholders(roles);
          
          // Initialize checkbox states and emails map
          const initialEmails = {};
          const initialNames = {};
          const initialSelected = [];
          
          roles.forEach(r => {
            initialEmails[r.role] = r.email || '';
            initialNames[r.role] = r.name || r.role;
            initialSelected.push(r.role); // check all by default
          });
          
          setEmailsMap(initialEmails);
          setNamesMap(initialNames);
          setSelectedRoles(initialSelected);
        }
      })
      .catch(err => console.error("Error loading stakeholders", err));

    // 2. Fetch all generated outputs
    fetch(`/api/outputs/${selectedTenant}/${selectedCycle}`)
      .then(res => res.json())
      .then(data => {
        const found = (data.outputs || []).find(o => o.agent === selectedAgent);
        if (found) {
          const payload = normalizePayloadKeys(found.payload);
          setAgentOutput(payload);
          
          // Extract sub-items if it's an array of steps or ads
          let items = [];
          if (selectedAgent === 'email_sequences' || payload.email_sequences || payload.steps || payload.emails) {
            const seqList = payload.email_sequences || (payload.steps || payload.emails ? [payload] : []);
            seqList.forEach(seq => {
              const steps = seq.steps || seq.emails || [];
              steps.forEach(step => {
                items.push({
                  type: 'email_step',
                  label: `Email Step ${step.step_number || (items.length + 1)}: ${step.subject || step.subject_line || 'Campaign Email'}`,
                  payload: step
                });
              });
            });
          } else if (selectedAgent === 'paid_ad_creative' || payload.google_search || payload.linkedin_ads) {
            const google = payload.google_search || [];
            google.forEach((ad, idx) => {
              items.push({
                type: 'ad_google',
                label: `Google Search Ad Variant ${idx + 1}`,
                payload: ad
              });
            });
            const linkedin = payload.linkedin_ads || [];
            linkedin.forEach((ad, idx) => {
              items.push({
                type: 'ad_linkedin',
                label: `LinkedIn Ad Variant ${idx + 1}`,
                payload: ad
              });
            });
          } else if (payload.variants && Array.isArray(payload.variants)) {
            payload.variants.forEach((v, idx) => {
              items.push({
                type: 'variant',
                label: `Variant ${idx + 1}: ${v.variant_label || 'Strategic Direction'}`,
                payload: v
              });
            });
          }

          setSubItems(items);
          setSelectedSubItemIndex(0);

          // Update default subject
          const agentName = ALL_AGENTS.find(a => a.id === selectedAgent)?.name || selectedAgent;
          setCustomSubject(`GTM OS Dispatch: ${agentName}`);
        } else {
          setAgentOutput(null);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading output", err);
        setIsLoading(false);
      });
  }, [selectedTenant, selectedCycle, selectedAgent]);

  // Handle sub-item selection to dynamically update subject line
  useEffect(() => {
    if (subItems.length > 0 && subItems[selectedSubItemIndex]) {
      const selected = subItems[selectedSubItemIndex];
      if (selected.type === 'email_step') {
        const rawSub = selected.payload.subject || selected.payload.subject_line || '';
        // Clean tokens for display in subject
        const cleanSub = rawSub
          .replace(/\{\{company_name\}\}/g, companyName)
          .replace(/\{\{first_name\}\}/g, 'Valued Partner')
          .replace(/\{\{industry\}\}/g, companyIndustry)
          .replace(/\{\{quarter_number\}\}/g, '3');
        setCustomSubject(cleanSub);
      }
    }
  }, [selectedSubItemIndex, subItems, companyName, companyIndustry]);

  // Select All/Deselect All Toggle
  const handleSelectAllToggle = (checked) => {
    if (checked) {
      setSelectedRoles(stakeholders.map(s => s.role));
    } else {
      setSelectedRoles([]);
    }
  };

  const handleRoleCheckboxChange = (role, checked) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, role]);
    } else {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    }
  };

  // Helper to replace B2B tags with readable text
  const cleanTokens = (text, recipientName = 'Partner') => {
    if (!text) return '';
    return String(text)
      .replace(/\{\{first_name\}\}/g, recipientName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{industry\}\}/g, companyIndustry)
      .replace(/\{\{quarter_number\}\}/g, '3');
  };

  const handleSendEmail = async () => {
    if (selectedRoles.length === 0) {
      alert("Please select at least one recipient to dispatch.");
      return;
    }
    
    // Validate emails for selected roles
    const recipientsList = [];
    for (const role of selectedRoles) {
      const email = emailsMap[role]?.trim();
      if (!email) {
        alert(`Please enter a valid email address for role: ${role}`);
        return;
      }
      recipientsList.push({
        role,
        name: namesMap[role] || role,
        email: email
      });
    }

    if (!agentOutput) {
      alert("No AI generated content found for this agent. Please generate content first.");
      return;
    }

    // Build the specific selected payload content
    let finalPayload = agentOutput;
    if (subItems.length > 0 && subItems[selectedSubItemIndex]) {
      finalPayload = subItems[selectedSubItemIndex].payload;
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: selectedTenant,
          cycle: selectedCycle,
          agent: selectedAgent,
          recipients: recipientsList,
          subject: customSubject,
          notes: customNotes + `\n\n[Dispatch Date: ${dispatchDate}]`,
          // Pass the single item payload directly
          stakeholder: { email: 'override' }, // backward compatibility key
          recipientsPayload: finalPayload 
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: 'Network error failed to send emails.' });
    }
    setIsSending(false);
  };

  // Render the selected single content cleanly
  const renderSinglePreview = () => {
    if (subItems.length === 0) {
      // Fallback for general text or non-array outputs
      if (typeof agentOutput === 'string') {
        return (
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.85rem' }}>
            {cleanTokens(agentOutput)}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Object.entries(agentOutput || {}).map(([k, v]) => {
            if (k === 'schema_version' || k === 'written_by_agent' || k === 'written_at') return null;
            return (
              <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{cleanTokens(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))}</div>
              </div>
            );
          })}
        </div>
      );
    }

    const selected = subItems[selectedSubItemIndex];
    if (!selected) return null;

    if (selected.type === 'email_step') {
      const email = selected.payload;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>📧 {selected.label}</span>
            <span style={{ fontSize: '0.8rem', color: '#999' }}>⏱️ Delay: {email.delay || email.delay_after_prior_step_hours ? `${email.delay_after_prior_step_hours}h` : 'Immediate'}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'white' }}>
            <strong>Subject:</strong> {cleanTokens(email.subject || email.subject_line)}
          </div>
          {email.preheader && (
            <div style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>
              <strong>Preheader:</strong> {cleanTokens(email.preheader)}
            </div>
          )}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '6px', marginTop: '0.5rem' }}>
            {cleanTokens(email.body_markdown || email.body || email.content)}
          </div>
          {email.cta && (
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.5rem' }}>
              <strong>CTA Button Action:</strong> <span style={{ background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>{cleanTokens(email.cta)}</span>
            </div>
          )}
        </div>
      );
    }

    if (selected.type === 'ad_google') {
      const ad = selected.payload;
      return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase' }}>Google Search Ad Preview</div>
          <div style={{ fontSize: '1rem', color: '#1a0dab', textDecoration: 'underline', fontWeight: 500 }}>
            {cleanTokens(Array.isArray(ad.headlines) ? ad.headlines.join(' | ') : ad.headlines)}
          </div>
          <div style={{ color: '#006621', fontSize: '0.75rem' }}>{ad.landing_url || 'https://example.com'}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{cleanTokens(ad.description)}</p>
        </div>
      );
    }

    if (selected.type === 'ad_linkedin') {
      const ad = selected.payload;
      return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#0077b5', fontWeight: 600, textTransform: 'uppercase' }}>LinkedIn Sponsored Ad Copy</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>{cleanTokens(ad.primary_text || ad.intro_text)}</p>
          {ad.headline && <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', marginTop: '0.5rem' }}>{cleanTokens(ad.headline)}</div>}
        </div>
      );
    }

    // Default variant fallback
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(selected.payload).map(([k, v]) => (
          <div key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{k.replace(/_/g, ' ')}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{cleanTokens(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animated-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* Configuration Card */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <Mail size={24} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Email Dispatcher Workspace</h2>
        </div>

        {/* Company Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Company / Tenant</label>
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>
        </div>

        {/* Stakeholder Selection Checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Recipient Selection (Select Members)</label>
            {stakeholders.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'white' }}>
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedRoles.length === stakeholders.length}
                  onChange={e => handleSelectAllToggle(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="select-all" style={{ cursor: 'pointer' }}>Select All</label>
              </div>
            )}
          </div>

          {stakeholders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>⚠️ Loading company stakeholder profiles...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {stakeholders.map(s => {
                const isChecked = selectedRoles.includes(s.role);
                return (
                  <div key={s.role} style={{ background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        id={`role-${s.role}`}
                        checked={isChecked}
                        onChange={e => handleRoleCheckboxChange(s.role, e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor={`role-${s.role}`} style={{ fontWeight: 600, color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {s.role} - {namesMap[s.role] || s.name}
                      </label>
                    </div>
                    <div style={{ paddingLeft: '1.5rem' }}>
                      <input
                        type="email"
                        value={emailsMap[s.role] || ''}
                        onChange={e => setEmailsMap({ ...emailsMap, [s.role]: e.target.value })}
                        placeholder="Enter email address..."
                        className="glass-input"
                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Agent Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>AI Agent Content Source</label>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          >
            {ALL_AGENTS.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>

        {/* Sub-item selector (Step selection dropdown) */}
        {subItems.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Specific Step / Ad Copy to Send</label>
            <select
              value={selectedSubItemIndex}
              onChange={e => setSelectedSubItemIndex(parseInt(e.target.value))}
              className="glass-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
            >
              {subItems.map((item, idx) => (
                <option key={idx} value={idx}>{item.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Selector */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            <Calendar size={14} />
            <span>Campaign Dispatch Date</span>
          </label>
          <input
            type="text"
            value={dispatchDate}
            onChange={e => setDispatchDate(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        {/* Subject Override */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Subject Line</label>
          <input
            type="text"
            value={customSubject}
            onChange={e => setCustomSubject(e.target.value)}
            placeholder="Enter custom email subject"
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        {/* Custom Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Additional Context / Review Comments</label>
          <textarea
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Add specific comments or change instructions for the stakeholders..."
            rows={3}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', resize: 'none' }}
          />
        </div>

        {/* Dispatch Action */}
        <button
          onClick={handleSendEmail}
          disabled={isSending || !agentOutput || selectedRoles.length === 0}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: (!agentOutput || selectedRoles.length === 0) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
            cursor: (!agentOutput || selectedRoles.length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSending ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Sending Dispatch...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Dispatch Email to Selected Members</span>
            </>
          )}
        </button>

        {/* Result Notification summary */}
        {result && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              background: result.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
              {result.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {result.success ? 'Dispatch Summary' : 'Dispatch Failed'}
            </div>
            
            {result.results ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                {result.results.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'white', fontWeight: 500 }}>{r.role} - {r.name}</span>
                      <span style={{ color: r.success ? 'var(--success)' : 'var(--danger)' }}>{r.success ? 'Sent' : 'Failed'}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.email}</div>
                    {r.previewUrl && (
                      <a
                        href={r.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'underline', marginTop: '0.1rem', display: 'inline-block' }}
                      >
                        🔗 Open Email Preview
                      </a>
                    )}
                    {r.error && <div style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>Error: {r.error}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{result.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Asset Preview Panel */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>Asset Output Preview</h2>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
            <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span>Retrieving generated content...</span>
          </div>
        ) : !agentOutput ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>No Content Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px' }}>
                The selected agent has not generated output for this campaign cycle. Generate it in **Agent Workflow & Run** tab.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '550px' }}>
              {renderSinglePreview()}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

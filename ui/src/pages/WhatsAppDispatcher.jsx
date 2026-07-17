import { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, AlertCircle, FileText, Loader, Calendar, Phone } from 'lucide-react';

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

export default function WhatsAppDispatcher({ tenants = [] }) {
  const [selectedTenant, setSelectedTenant] = useState(tenants.length > 0 ? tenants[0].id : '_example');
  const [selectedCycle, setSelectedCycle] = useState('2026-Q3');
  const [selectedAgent, setSelectedAgent] = useState('email_sequences');
  
  // Company details for token replacement
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');

  // Dynamic list of stakeholders
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  // Contacts map: role -> custom phone number, role -> name
  const [phonesMap, setPhonesMap] = useState({});
  const [namesMap, setNamesMap] = useState({});
  
  const [agentOutput, setAgentOutput] = useState(null);
  const [subItems, setSubItems] = useState([]);
  const [selectedSubItemIndex, setSelectedSubItemIndex] = useState(0);

  // Custom overrides
  const [customHeader, setCustomHeader] = useState('*📢 GTM OS CAMPAIGN DISPATCH*');
  const [customNotes, setCustomNotes] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  
  // UI Status
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  // Load profiles and outputs
  useEffect(() => {
    if (!selectedTenant) return;
    setIsLoading(true);
    setResult(null);
    setAgentOutput(null);
    setSubItems([]);
    setSelectedSubItemIndex(0);
    
    setStakeholders([]);
    setSelectedRoles([]);
    setPhonesMap({});
    setNamesMap({});

    // 1. Fetch Company profile
    fetch(`/api/tenant-profile/${selectedTenant}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          const profile = data.profile;
          setCompanyName(profile.company?.brand_name || selectedTenant);
          setCompanyIndustry(profile.industry?.primary || 'B2B SaaS');

          const roles = profile.approval_roles || [];
          setStakeholders(roles);
          
          const initialPhones = {};
          const initialNames = {};
          const initialSelected = [];
          
          roles.forEach((r, idx) => {
            // Scaffold dummy test phone numbers based on roles
            const countryCode = '+91';
            const dummyNumber = `${9876500000 + idx + 1}`;
            initialPhones[r.role] = r.phone || (countryCode + dummyNumber);
            initialNames[r.role] = r.name || r.role;
            initialSelected.push(r.role);
          });
          
          setPhonesMap(initialPhones);
          setNamesMap(initialNames);
          setSelectedRoles(initialSelected);
        }
      })
      .catch(err => console.error("Error loading stakeholders", err));

    // 2. Fetch agent outputs
    fetch(`/api/outputs/${selectedTenant}/${selectedCycle}`)
      .then(res => res.json())
      .then(data => {
        const found = (data.outputs || []).find(o => o.agent === selectedAgent);
        if (found) {
          const payload = found.payload;
          setAgentOutput(payload);
          
          let items = [];
          if (selectedAgent === 'email_sequences' || payload.email_sequences || payload.steps || payload.emails) {
            const seqList = payload.email_sequences || payload.steps || payload.emails || [];
            seqList.forEach(seq => {
              const steps = seq.steps || [];
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

  // Convert HTML or plain text tags to WhatsApp markdown formats (*bold*, _italic_, ~strike~)
  const cleanTokensForWhatsApp = (text, recipientName = 'Partner') => {
    if (!text) return '';
    return String(text)
      .replace(/\{\{first_name\}\}/g, `*${recipientName}*`)
      .replace(/\{\{company_name\}\}/g, `*${companyName}*`)
      .replace(/\{\{industry\}\}/g, `*${companyIndustry}*`)
      .replace(/\{\{quarter_number\}\}/g, '*3*')
      // Clean HTML tags if any leak
      .replace(/<[^>]*>/g, '');
  };

  // Build the compiled text message block that will be dispatched
  const compileWhatsAppMessage = (recipientName = 'Partner') => {
    let finalPayload = agentOutput;
    if (subItems.length > 0 && subItems[selectedSubItemIndex]) {
      finalPayload = subItems[selectedSubItemIndex].payload;
    }

    let messageBody = '';
    if (!finalPayload) {
      messageBody = 'No content generated.';
    } else if (typeof finalPayload === 'string') {
      messageBody = cleanTokensForWhatsApp(finalPayload, recipientName);
    } else {
      // It's a structured object (e.g. Email step or ad)
      if ((finalPayload.subject || finalPayload.subject_line) && (finalPayload.body_markdown || finalPayload.body || finalPayload.content)) {
        const sub = finalPayload.subject || finalPayload.subject_line;
        const body = finalPayload.body_markdown || finalPayload.body || finalPayload.content;
        messageBody = `*Subject:* ${cleanTokensForWhatsApp(sub, recipientName)}\n\n${cleanTokensForWhatsApp(body, recipientName)}`;
        if (finalPayload.cta) {
          messageBody += `\n\n*CTA Button Action:* _${cleanTokensForWhatsApp(finalPayload.cta, recipientName)}_`;
        }
      } else {
        // Generic object formatting
        Object.entries(finalPayload).forEach(([k, v]) => {
          if (k === 'schema_version' || k === 'written_by_agent' || k === 'written_at') return;
          messageBody += `*${k.toUpperCase().replace(/_/g, ' ')}:*\n${cleanTokensForWhatsApp(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v), recipientName)}\n\n`;
        });
      }
    }

    return `${customHeader}\n_Date: ${dispatchDate}_\n\nHello *${recipientName}*,\nThe GTM OS AI Agent *${selectedAgent}* has dispatched the following deliverable package:\n\n---\n\n${messageBody.trim()}\n\n---\n${customNotes ? `*Notes from Reviewer:* ${customNotes}\n` : ''}`;
  };

  const handleSendWhatsApp = async () => {
    if (selectedRoles.length === 0) {
      alert("Please select at least one recipient to dispatch.");
      return;
    }

    const recipientsList = [];
    for (const role of selectedRoles) {
      const phone = phonesMap[role]?.trim();
      if (!phone) {
        alert(`Please enter a valid phone number for role: ${role}`);
        return;
      }
      recipientsList.push({
        role,
        name: namesMap[role] || role,
        phone: phone,
        compiledMessage: compileWhatsAppMessage(namesMap[role] || role)
      });
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/dispatch-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: selectedTenant,
          cycle: selectedCycle,
          agent: selectedAgent,
          recipients: recipientsList
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: 'Network error. Failed to dispatch WhatsApp messages.' });
    }
    setIsSending(false);
  };

  return (
    <div className="animated-page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* Configuration Card */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <MessageSquare size={24} style={{ color: '#25D366' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>WhatsApp Dispatcher Workspace</h2>
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

        {/* Recipient phone checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Recipient Checklist (Phone Numbers)</label>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
                    <div style={{ paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={12} style={{ color: '#25D366' }} />
                      <input
                        type="text"
                        value={phonesMap[s.role] || ''}
                        onChange={e => setPhonesMap({ ...phonesMap, [s.role]: e.target.value })}
                        placeholder="e.g. +919876543210"
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

        {/* Sub-item step selector */}
        {subItems.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Specific Step / Ad Copy</label>
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

        {/* WhatsApp Header Customizer */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>WhatsApp Header Block</label>
          <input
            type="text"
            value={customHeader}
            onChange={e => setCustomHeader(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
          />
        </div>

        {/* Dispatch Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Custom Notes / Comments (Appended at end)</label>
          <textarea
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Review updates, budget figures, or instructions..."
            rows={2}
            className="glass-input"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', resize: 'none' }}
          />
        </div>

        {/* Dispatch Action */}
        <button
          onClick={handleSendWhatsApp}
          disabled={isSending || !agentOutput || selectedRoles.length === 0}
          className="glass-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: (!agentOutput || selectedRoles.length === 0) ? 'rgba(255,255,255,0.05)' : '#25D366',
            color: (!agentOutput || selectedRoles.length === 0) ? 'rgba(255,255,255,0.3)' : '#000',
            cursor: (!agentOutput || selectedRoles.length === 0) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isSending ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Sending WhatsApp Dispatches...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Send WhatsApp Dispatches</span>
            </>
          )}
        </button>

        {/* Results display */}
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
              {result.success ? 'WhatsApp Dispatch Summary' : 'Dispatch Failed'}
            </div>
            
            {result.results && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                {result.results.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'white', fontWeight: 500 }}>{r.role} - {r.name}</span>
                      <span style={{ color: r.success ? 'var(--success)' : 'var(--danger)' }}>{r.success ? 'Sent' : 'Fallback Ready'}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.phone}</div>
                    
                    {/* Fallback Direct Click-to-Chat Button */}
                    {r.clickToChatUrl && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <a
                          href={r.clickToChatUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#25D366',
                            color: '#000',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            fontSize: '0.75rem'
                          }}
                        >
                          💬 Send via WhatsApp Web (Free)
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Mockup Preview Panel */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600 }}>WhatsApp Chat Preview</h2>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
            <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span>Formatting chat preview...</span>
          </div>
        ) : !agentOutput ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>No Content Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Run AI agents to generate content in Agent Workflow tab first.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b141a', borderRadius: '12px', border: '1px solid #233138', overflow: 'hidden' }}>
            
            {/* Phone header */}
            <div style={{ background: '#202c33', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #2f3b43' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', color: '#000', display: 'flex', alignItems: 'center', justifyObject: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                👤
              </div>
              <div>
                <div style={{ color: '#e9edef', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {selectedRoles.length > 0 ? `${namesMap[selectedRoles[0]] || selectedRoles[0]} (${selectedRoles[0]})` : 'Stakeholder'}
                </div>
                <div style={{ color: '#8696a0', fontSize: '0.7rem' }}>online</div>
              </div>
            </div>

            {/* Chat Messages Container */}
            <div style={{ flex: 1, padding: '1.5rem', backgroundImage: 'radial-gradient(#1e2b34 10%, transparent 11%)', backgroundSize: '15px 15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '350px' }}>
              
              {/* Message Bubble */}
              <div style={{ alignSelf: 'flex-end', background: '#005c4b', border: '1px solid #005c4b', borderRadius: '8px 0 8px 8px', padding: '0.75rem 1rem', maxWidth: '85%', color: '#e9edef', fontSize: '0.85rem', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)', position: 'relative' }}>
                
                {/* Arrow */}
                <div style={{ position: 'absolute', right: '-8px', top: 0, width: 0, height: 0, borderTop: '8px solid #005c4b', borderRight: '8px solid transparent' }} />
                
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                  {compileWhatsAppMessage(selectedRoles.length > 0 ? (namesMap[selectedRoles[0]] || selectedRoles[0]) : 'Partner')}
                </pre>
                
                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#8696a0', marginTop: '0.25rem' }}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
            </div>
            
            {/* Input Bar */}
            <div style={{ background: '#202c33', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ flex: 1, background: '#2a3942', borderRadius: '8px', padding: '0.5rem 1rem', color: '#8696a0', fontSize: '0.85rem' }}>
                Type a message
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                🎤
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

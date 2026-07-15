import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function AdCreativeRenderer({ payload }) {
  const [platform, setPlatform] = useState('google');
  const pack = payload?.paid_ad_creative_pack || payload || {};

  // Normalize fields dynamically (handles both nested platforms and flat ad_creatives list)
  let googleList = pack.google_search || [];
  let linkedinList = pack.linkedin_ads || [];
  let metaList = pack.meta_ads || [];

  if (pack.ad_creatives && Array.isArray(pack.ad_creatives)) {
    googleList = pack.ad_creatives.filter(c => c.platform === 'google_search');
    linkedinList = pack.ad_creatives.filter(c => c.platform === 'linkedin_ads' || c.platform === 'linkedin');
    metaList = pack.ad_creatives.filter(c => c.platform === 'meta_ads' || c.platform === 'meta');
  }

  // If still empty, check fallback array structures
  if (googleList.length === 0 && payload.google_search) googleList = [payload];
  if (linkedinList.length === 0 && payload.linkedin_ads) linkedinList = [payload];
  if (metaList.length === 0 && payload.meta_ads) metaList = [payload];

  const getCleanUrl = (rawUrl, variantLabel, campaignId, adGroupId) => {
    if (!rawUrl) return '#';
    let url = rawUrl
      .replace('{{platform}}', platform)
      .replace('{{campaign_id}}', campaignId || '')
      .replace('{{variant_label}}', variantLabel || '')
      .replace('{{ad_group_id}}', adGroupId || '');

    if (!url.startsWith('http') && !url.startsWith('//')) {
      if (url.startsWith('/')) {
        url = window.location.origin + url;
      } else {
        url = 'https://' + url;
      }
    }
    return url;
  };

  const renderVideoPlayer = (brief) => {
    if (!brief || brief === 'null') return null;
    return (
      <div style={{ marginTop: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Video Screen */}
        <div style={{ height: '180px', background: 'linear-gradient(135deg, #111827 0%, #1e1b4b 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', padding: '1rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', marginBottom: '0.75rem', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            <span style={{ fontSize: '1.5rem', color: '#fff', marginLeft: '3px' }}>▶</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Simulated Video Preview</div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0 0', maxWidth: '400px', fontStyle: 'italic', lineHeight: 1.4 }}>"{brief}"</p>
          <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', color: '#ccc' }}>1080p HD</span>
        </div>
        {/* Video Control Bar */}
        <div style={{ padding: '0.5rem 1rem', background: '#111827', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#fff', fontSize: '0.8rem' }}>0:00 / 0:15</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative' }}>
            <div style={{ width: '30%', height: '100%', background: '#4f46e5', borderRadius: '2px' }}></div>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>🔊</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Platform Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setPlatform('google')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: platform === 'google' ? 'rgba(79,70,229,0.15)' : 'transparent', color: platform === 'google' ? '#a5b4fc' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >
          🔍 Google Search Ads
        </button>
        <button
          onClick={() => setPlatform('linkedin')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: platform === 'linkedin' ? 'rgba(0,119,181,0.15)' : 'transparent', color: platform === 'linkedin' ? '#0077b5' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >
          💼 LinkedIn Sponsored Ads
        </button>
        <button
          onClick={() => setPlatform('meta')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: platform === 'meta' ? 'rgba(236,64,122,0.15)' : 'transparent', color: platform === 'meta' ? '#ec407a' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
        >
          📸 Meta (FB / IG) Ads
        </button>
      </div>

      {/* Google Platform Panel */}
      {platform === 'google' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {googleList.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No Google Search Ads generated.</p>}
          {googleList.map((camp, cIdx) => (
            <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#999' }}>Campaign: <strong style={{ color: 'white' }}>{camp.campaign_id}</strong></div>
              {camp.ad_groups?.map((grp, gIdx) => (
                <div key={gIdx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.5rem' }}>
                  <h4 style={{ color: '#4f46e5', fontSize: '1rem', marginTop: 0, marginBottom: '1rem' }}>📦 Ad Group: {grp.ad_group_id}</h4>

                  {/* Keywords Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>TARGET KEYWORDS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {grp.keywords?.map((k, idx) => (
                          <span key={idx} style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {typeof k === 'object' && k !== null ? k.term : k}
                          </span>
                        ))}
                      </div>
                    </div>
                    {grp.negative_keywords && (
                      <div>
                        <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>NEGATIVE KEYWORDS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {grp.negative_keywords?.map((k, idx) => (
                            <span key={idx} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              {typeof k === 'object' && k !== null ? k.term : k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ad Result Previews */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600 }}>AD COPY PREVIEWS</div>
                    {grp.ad_variants?.map((v, idx) => {
                      const resolvedUrl = getCleanUrl(v.landing_url || grp.landing_url, v.variant_label, camp.campaign_id, grp.ad_group_id);
                      const handleAdClick = () => {
                        window.open(resolvedUrl, '_blank');
                      };

                      return (
                        <div key={idx} style={{ background: '#121212', border: '1px solid #222', borderRadius: '8px', padding: '1.25rem', fontFamily: 'Arial, sans-serif' }}>
                          <div
                            onClick={handleAdClick}
                            style={{ color: '#8ab4f8', fontSize: '1.2rem', marginBottom: '0.25rem', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {v.headlines?.join(' | ') || 'Ad Headline'}
                          </div>
                          <div style={{ color: '#34a853', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                            Ad · {resolvedUrl}
                          </div>
                          <div style={{ color: '#bdc1c6', fontSize: '0.85rem', lineHeight: 1.4 }}>
                            {v.description || 'Ad description body goes here.'}
                          </div>
                          {v.cta && (
                            <button
                              onClick={handleAdClick}
                              style={{ marginTop: '0.75rem', display: 'inline-block', fontSize: '0.75rem', color: '#8ab4f8', border: '1px solid #444', background: 'transparent', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseOver={e => e.target.style.background = 'rgba(138,180,248,0.1)'}
                              onMouseOut={e => e.target.style.background = 'transparent'}
                            >
                              {v.cta}
                            </button>
                          )}
                          {renderVideoPlayer(v.video_brief)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* LinkedIn Platform Panel */}
      {platform === 'linkedin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {linkedinList.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No LinkedIn Ads generated.</p>}
          {linkedinList.map((camp, cIdx) => (
            <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#999' }}>Campaign: <strong style={{ color: 'white' }}>{camp.campaign_id}</strong></div>
              {camp.ad_groups?.map((grp, gIdx) => (
                <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {grp.ad_variants?.map((v, idx) => (
                    <div key={idx} style={{ background: '#1d2226', border: '1px solid #2f3539', borderRadius: '8px', padding: '1.25rem', maxWidth: '550px', margin: '0 auto', width: '100%', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
                      {/* LinkedIn Header */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#0077b5' }}>💼</div>
                        <div>
                          <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Sponsored Ad Sponsor</div>
                          <div style={{ color: '#888', fontSize: '0.75rem' }}>Promoted</div>
                        </div>
                      </div>

                      {/* Post Text */}
                      <p style={{ color: '#e1e3e6', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem 0', whiteSpace: 'pre-wrap' }}>{v.primary_text || v.description}</p>

                      {/* Media Image Box */}
                      <div style={{ background: '#0a0d10', border: '1px solid #2f3539', borderRadius: '4px', overflow: 'hidden' }}>
                        {v.image_prompt ? (
                          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #2f3539' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                            <div style={{ fontSize: '0.75rem', color: '#0077b5', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>AI Graphic Generator Prompt</div>
                            <p style={{ color: '#888', fontSize: '0.8rem', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>"{v.image_prompt}"</p>
                          </div>
                        ) : (
                          <div style={{ height: '150px', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>No image specified</div>
                        )}

                        {/* Ad Bottom Bar */}
                        <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1d2226' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{v.headlines?.[0] || 'Headline'}</div>
                            <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '0.15rem' }}>company.com</div>
                          </div>
                          {v.cta && (
                            <button
                              onClick={() => {
                                const resolvedUrl = getCleanUrl(v.landing_url || grp.landing_url, v.variant_label, camp.campaign_id, grp.ad_group_id);
                                window.open(resolvedUrl, '_blank');
                              }}
                              style={{ background: 'transparent', border: '1px solid #0077b5', color: '#0077b5', padding: '0.4rem 1rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {v.cta}
                            </button>
                          )}
                        </div>
                      </div>
                      {renderVideoPlayer(v.video_brief)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Meta Platform Panel */}
      {platform === 'meta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {metaList.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No Meta Ads generated.</p>}
          {metaList.map((camp, cIdx) => (
            <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#999' }}>Campaign: <strong style={{ color: 'white' }}>{camp.campaign_id}</strong></div>
              {camp.ad_groups?.map((grp, gIdx) => (
                <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {grp.ad_variants?.map((v, idx) => (
                    <div key={idx} style={{ background: '#242526', border: '1px solid #3e4042', borderRadius: '8px', padding: '1.25rem', maxWidth: '500px', margin: '0 auto', width: '100%', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                      {/* FB Header */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#ec407a' }}>📸</div>
                        <div>
                          <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Sponsored Facebook Post</div>
                          <div style={{ color: '#b0b3b8', fontSize: '0.75rem' }}>Sponsored · 🌐</div>
                        </div>
                      </div>

                      {/* Post Text */}
                      <p style={{ color: '#e4e6eb', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem 0', whiteSpace: 'pre-wrap' }}>{v.primary_text || v.description}</p>

                      {/* Media Image Box */}
                      <div style={{ background: '#18191a', border: '1px solid #3e4042', borderRadius: '4px', overflow: 'hidden' }}>
                        {v.image_prompt ? (
                          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid #3e4042' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                            <div style={{ fontSize: '0.75rem', color: '#ec407a', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>AI Visual Prompt</div>
                            <p style={{ color: '#b0b3b8', fontSize: '0.8rem', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>"{v.image_prompt}"</p>
                          </div>
                        ) : (
                          <div style={{ height: '150px', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>No image specified</div>
                        )}

                        {/* Ad Bottom Bar */}
                        <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242526' }}>
                          <div>
                            <div style={{ color: '#b0b3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>company.com</div>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.15rem' }}>{v.headlines?.[0] || 'Headline'}</div>
                            {v.link_description && <div style={{ color: '#b0b3b8', fontSize: '0.75rem', marginTop: '0.15rem' }}>{v.link_description}</div>}
                          </div>
                          {v.cta && (
                            <button
                              onClick={() => {
                                const resolvedUrl = getCleanUrl(v.landing_url || grp.landing_url, v.variant_label, camp.campaign_id, grp.ad_group_id);
                                window.open(resolvedUrl, '_blank');
                              }}
                              style={{ background: '#3a3b3c', border: 'none', color: '#e4e6eb', padding: '0.45rem 1rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {v.cta}
                            </button>
                          )}
                        </div>
                      </div>
                      {renderVideoPlayer(v.video_brief)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailSequenceRenderer({ payload }) {
  const sequences = payload?.email_sequences || (payload?.steps || payload?.emails ? [payload] : []);
  const [activeIdx, setActiveIdx] = useState(0);

  if (sequences.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No email sequences available.</p>;
  }

  const currentSeq = sequences[activeIdx] || sequences[0];
  const steps = currentSeq.steps || currentSeq.emails || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sequence Tabs */}
      {sequences.length > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {sequences.map((seq, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: activeIdx === idx ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: activeIdx === idx ? '#10b981' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              ✉️ {seq.purpose || seq.sequence_id || `Sequence ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Sequence Metadata */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem' }}>
        <h3 style={{ color: '#eaf1ff', marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
          🎯 {currentSeq.purpose || 'Email Sequence Campaign'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          {currentSeq.trigger && (
            <div>
              <span style={{ color: '#888', display: 'block', marginBottom: '0.2rem' }}>TRIGGER EVENT</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{currentSeq.trigger}</span>
            </div>
          )}
          {currentSeq.primary_persona_id && (
            <div>
              <span style={{ color: '#888', display: 'block', marginBottom: '0.2rem' }}>TARGET PERSONA</span>
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{currentSeq.primary_persona_id}</span>
            </div>
          )}
          {currentSeq.suppression_rules && currentSeq.suppression_rules.length > 0 && (
            <div>
              <span style={{ color: '#888', display: 'block', marginBottom: '0.2rem' }}>SUPPRESSION RULES</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {currentSeq.suppression_rules.map((r, i) => (
                  <span key={i} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {steps.map((email, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#10b981', fontWeight: 600, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Step {email.step_number || (i + 1)} {email.delay_after_prior_step_hours ? `(Wait ${email.delay_after_prior_step_hours}h)` : '(Instant)'}</span>
              {email.cta && <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>CTA Active</span>}
            </div>
            <div style={{ padding: '1.5rem' }}>
              {email.subject && (
                <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#999', fontSize: '0.9rem' }}>
                  Subject: <strong style={{ color: '#eaf1ff' }}>{email.subject}</strong>
                </div>
              )}
              {email.preheader && (
                <div style={{ marginBottom: '1rem', color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Preheader: {email.preheader}
                </div>
              )}
              <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8, fontSize: '0.9rem' }}>
                {email.body_markdown || email.body}
              </div>
              {email.cta && (
                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button style={{ background: '#10b981', color: '#000', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    {email.cta}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONTENT_TYPES = {
  seo_content: { label: '📝 SEO Blog Article', color: '#2f72ff', bg: 'rgba(47,114,255,0.1)' },
  social_content: { label: '🔗 LinkedIn / Social Posts', color: '#0077b5', bg: 'rgba(0,119,181,0.1)' },
  email_sequences: { label: '📧 Sales Email Sequence', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  website_copy: { label: '🌐 Website Copy', color: '#7c5cff', bg: 'rgba(124,92,255,0.1)' },
  market_research: { label: '🔬 Market Research', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  positioning: { label: '🎯 Positioning Statement', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};



export default function ContentViewer({ tenants = [] }) {
  const [searchParams] = useSearchParams();
  const urlTenant = searchParams.get('tenant');
  const urlCycle = searchParams.get('cycle');
  const urlAgent = searchParams.get('agent');

  const [tenant, setTenant] = useState(urlTenant || (tenants.length > 0 ? tenants[0].id : '_example'));
  const [cycle, setCycle] = useState(urlCycle || '2026-Q3');
  const [cycles, setCycles] = useState([{ id: '2026-Q3' }]);
  const [outputs, setOutputs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCycles = async (selectedTenant) => {
    try {
      const res = await fetch(`/api/cycles/${selectedTenant}`);
      const data = await res.json();
      if (data.cycles && data.cycles.length > 0) {
        setCycles(data.cycles);
        const hasUrlCycle = data.cycles.some(c => c.id === urlCycle);
        setCycle(hasUrlCycle ? urlCycle : data.cycles[0].id);
      } else {
        setCycles([{ id: '2026-Q3' }]);
        setCycle('2026-Q3');
      }
    } catch {
      setCycles([{ id: '2026-Q3' }]);
      setCycle('2026-Q3');
    }
  };

  useEffect(() => {
    if (tenant) {
      loadCycles(tenant);
    }
  }, [tenant]);

  const fetchOutputs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/outputs/${tenant}/${cycle}`);
      const data = await res.json();
      if (data.outputs && data.outputs.length > 0) {
        setOutputs(data.outputs);
        const hasUrlAgent = data.outputs.some(o => o.agent === urlAgent);
        setActiveTab(hasUrlAgent ? urlAgent : data.outputs[0].agent);
      } else {
        setOutputs([]);
        setActiveTab(null);
      }
    } catch {
      setOutputs([]);
      setActiveTab(null);
    }
    setIsLoading(false);
  };

  useEffect(() => { if (tenant) fetchOutputs(); }, [tenant, cycle]);

  const activeOutput = outputs.find(o => o.agent === activeTab);
  const cfg = CONTENT_TYPES[activeTab] || { label: activeTab, color: '#999', bg: 'rgba(255,255,255,0.05)' };

  const renderPayload = (agent, payload) => {
    if (!payload) return <p style={{ color: 'var(--text-secondary)' }}>No content available.</p>;

    if (agent === 'seo_content' && payload.body) {
      return (
        <div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <span className="status-badge" style={{ background: 'rgba(47,114,255,0.1)', color: '#2f72ff' }}>🎯 Keyword: {payload.target_keyword}</span>
            <span className="status-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>📖 {payload.estimated_read_time}</span>
            <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#999' }}>✍️ {payload.word_count} words</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.5rem' }}>META DESCRIPTION</div>
            <p style={{ color: '#ccc', fontStyle: 'italic' }}>{payload.meta_description}</p>
          </div>
          <h2 style={{ color: '#eaf1ff', fontSize: '1.5rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>{payload.title}</h2>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{payload.body}</div>
        </div>
      );
    }

    if (agent === 'social_content') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#0077b5', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '1rem' }}>LINKEDIN POST</div>
            <div style={{ background: 'rgba(0,119,181,0.05)', border: '1px solid rgba(0,119,181,0.2)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,119,181,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5', fontWeight: 'bold' }}>M</div>
                <div><div style={{ color: '#eaf1ff', fontWeight: 600 }}>Microsoft</div><div style={{ color: '#999', fontSize: '0.8rem' }}>Just now</div></div>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{payload.linkedin_post}</p>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#1da1f2', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '1rem' }}>TWITTER / X THREAD</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {payload.twitter_thread?.map((tweet, i) => (
                <div key={i} style={{ background: 'rgba(29,161,242,0.05)', border: '1px solid rgba(29,161,242,0.15)', borderRadius: '12px', padding: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{tweet}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (agent === 'paid_ad_creative' || payload.google_search || payload.linkedin_ads || payload.meta_ads || payload.paid_ad_creative_pack) {
      return <AdCreativeRenderer payload={payload} />;
    }

    if (agent === 'email_sequences' || payload.steps || payload.emails || payload.email_sequences) {
      return <EmailSequenceRenderer payload={payload} />;
    }

    if (agent === 'market_research' || payload.competitors) {
      const comps = payload.competitors || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            AI-generated Competitor Landscapes and Differentiator Matrix.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {comps.map((comp, idx) => (
              <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#eaf1ff', margin: 0, fontSize: '1.2rem' }}>{comp.name}</h3>
                    {comp.url && <a href={comp.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#f59e0b', textDecoration: 'none' }}>{comp.url}</a>}
                  </div>
                  {comp.review_rating && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>⭐ {comp.review_rating} / 5</span>
                      <div style={{ fontSize: '0.75rem', color: '#777' }}>via {comp.review_source}</div>
                    </div>
                  )}
                </div>

                {/* Body details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>POSITIONING STATEMENT</div>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.positioning}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>KEY DIFFERENTIATOR</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.key_differentiator}</p>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>PRICING MODEL</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.pricing_model}</p>
                    </div>
                  </div>

                  {/* Praise vs Weakness Columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👍 STRENGTHS & PRAISE POINTS</div>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {comp.praise_points?.map((pt, i) => <li key={i}>{pt}</li>)}
                      </ul>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👎 WEAKNESSES & GAP AREAS</div>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {comp.weaknesses?.map((wt, i) => <li key={i}>{wt}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (agent === 'market_research' || payload.competitors) {
      const comps = payload.competitors || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            AI-generated Competitor Landscapes and Differentiator Matrix.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {comps.map((comp, idx) => (
              <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#eaf1ff', margin: 0, fontSize: '1.2rem' }}>{comp.name}</h3>
                    {comp.url && <a href={comp.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#f59e0b', textDecoration: 'none' }}>{comp.url}</a>}
                  </div>
                  {comp.review_rating && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>⭐ {comp.review_rating} / 5</span>
                      <div style={{ fontSize: '0.75rem', color: '#777' }}>via {comp.review_source}</div>
                    </div>
                  )}
                </div>

                {/* Body details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>POSITIONING STATEMENT</div>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.positioning}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>KEY DIFFERENTIATOR</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.key_differentiator}</p>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>PRICING MODEL</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{comp.pricing_model}</p>
                    </div>
                  </div>

                  {/* Praise vs Weakness Columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👍 STRENGTHS & PRAISE POINTS</div>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {comp.praise_points?.map((pt, i) => <li key={i}>{pt}</li>)}
                      </ul>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👎 WEAKNESSES & GAP AREAS</div>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {comp.weaknesses?.map((wt, i) => <li key={i}>{wt}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (agent === 'positioning' || payload.variants) {
      const vars = payload.variants || [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Core positioning framework and elevator pitch variants.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {vars.map((v, i) => (
              <div key={i} style={{ border: '1px solid rgba(124,92,255,0.2)', borderRadius: '12px', background: 'rgba(124,92,255,0.02)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.75rem' }}>
                  <span className="status-badge" style={{ background: 'rgba(124,92,255,0.15)', color: '#a78bfa', fontWeight: 'bold' }}>
                    Variant: {v.variant_label?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category: <strong>{v.category}</strong></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>TARGET AUDIENCE</div>
                    <p style={{ color: '#ccc', fontSize: '0.9rem' }}>{v.target_audience}</p>
                  </div>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>CORE POSITIONING STATEMENT</div>
                    <p style={{ color: '#fff', fontSize: '1rem', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                      {v.statement}
                    </p>
                  </div>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>PRIMARY VALUE PROPOSITION</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{v.primary_value}</p>
                  </div>
                  {v.competing_alternatives && (
                    <div>
                      <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>COMPETING ALTERNATIVES</div>
                      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem' }}>
                        {v.competing_alternatives.map((alt, idx) => <li key={idx}>{alt}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Generic Universal Smart Auto-Renderer Fallback
    // Recursively formats any unknown JSON object into professional dashboard cards
    const renderSmartObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return <span style={{ color: '#fff' }}>{String(obj)}</span>;
      }

      if (Array.isArray(obj)) {
        return (
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {obj.map((item, idx) => (
              <li key={idx}>
                {typeof item === 'object' ? renderSmartObject(item) : String(item)}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {Object.entries(obj).map(([key, val]) => {
            if (key === 'schema_version' || key === 'written_by_agent' || key === 'written_at' || key === 'tenant_id' || key === 'cycle_id') return null;
            const displayKey = key.replace(/_/g, ' ').toUpperCase();
            const isComplex = typeof val === 'object' && val !== null;

            return (
              <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  {displayKey}
                </div>
                <div>
                  {isComplex ? renderSmartObject(val) : <p style={{ color: '#eaf1ff', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>{String(val)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        {renderSmartObject(payload)}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header Controls */}
      <div className="glass-card animated-page" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Company</label>
          {tenants.length > 0 ? (
            <select value={tenant} onChange={e => setTenant(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
            </select>
          ) : (
            <input value={tenant} onChange={e => setTenant(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} placeholder="e.g. microsoft" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Campaign Cycle</label>
          <select
            value={cycle}
            onChange={e => setCycle(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white', appearance: 'none' }}
          >
            {cycles.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
          </select>
        </div>
        <button onClick={fetchOutputs} className="btn" style={{ padding: '0.75rem 1.5rem', height: 'fit-content' }}>
          {isLoading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {outputs.length === 0 && !isLoading && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ color: '#eaf1ff', marginBottom: '0.5rem' }}>No content generated yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Go to <strong>Workflow & Agent Deep-Dive</strong> and run a campaign cycle for <strong>{tenant}</strong> to see generated content appear here.</p>
        </div>
      )}

      {outputs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left sidebar: content type tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {outputs.map(o => {
              const c = CONTENT_TYPES[o.agent] || { label: o.agent, color: '#999', bg: 'rgba(255,255,255,0.05)' };
              const isActive = activeTab === o.agent;
              return (
                <button key={o.agent} onClick={() => setActiveTab(o.agent)} style={{ padding: '1rem', borderRadius: '10px', border: `1px solid ${isActive ? c.color : 'rgba(255,255,255,0.06)'}`, background: isActive ? c.bg : 'rgba(255,255,255,0.02)', color: isActive ? c.color : 'var(--text-secondary)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 }}>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Right: content display */}
          {activeOutput && (
            <div className="glass-card animated-page" style={{ padding: '2rem', minHeight: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <h2 style={{ color: cfg.color, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{cfg.label}</h2>
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>
                    Generated for: <strong style={{ color: '#999' }}>{tenant}</strong> · Cycle: <strong style={{ color: '#999' }}>{cycle}</strong>
                    {activeOutput.written_at && <span> · {new Date(activeOutput.written_at).toLocaleDateString()}</span>}
                  </p>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(activeOutput.payload, null, 2))} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                  📋 Copy
                </button>
              </div>
              {renderPayload(activeTab, activeOutput.payload)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

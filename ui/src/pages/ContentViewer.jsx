import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  normalizePayloadKeys, 
  AudienceIntelligenceRenderer, 
  EmailSequenceRenderer,
  MarkdownRenderer
} from '../components/Renderers';

function MarketResearchRenderer({ payload }) {
  const [tab, setTab] = useState('competitors');
  
  const competitors = payload.competitors || [];
  const landscape = payload['market landscape'] || payload['market_landscape'] || {};
  const whitespace = payload['positioning whitespace'] || payload['positioning_whitespace'] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setTab('competitors')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'competitors' ? 'rgba(245,158,11,0.15)' : 'transparent', color: tab === 'competitors' ? '#f59e0b' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🏢 Competitor Landscapes ({competitors.length})
        </button>
        <button
          onClick={() => setTab('landscape')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'landscape' ? 'rgba(79,70,229,0.15)' : 'transparent', color: tab === 'landscape' ? '#a5b4fc' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          📊 Market Landscape & TAM
        </button>
        <button
          onClick={() => setTab('whitespace')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: tab === 'whitespace' ? 'rgba(16,185,129,0.15)' : 'transparent', color: tab === 'whitespace' ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🎯 Positioning Whitespace
        </button>
      </div>

      {/* Competitors Tab */}
      {tab === 'competitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {competitors.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No competitors analyzed.</p>}
          {competitors.map((comp, idx) => (
            <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
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
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>POSITIONING STATEMENT</div>
                  <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{comp.positioning}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>KEY DIFFERENTIATOR</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{comp.key_differentiator}</p>
                  </div>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>PRICING MODEL</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{comp.pricing_model}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👍 STRENGTHS & PRAISE POINTS</div>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                      {comp.praise_points?.map((pt, i) => <li key={i}>{pt}</li>)}
                    </ul>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.25rem', borderRadius: '8px' }}>
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>👎 WEAKNESSES & GAP AREAS</div>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                      {comp.weaknesses?.map((wt, i) => <li key={i}>{wt}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Landscape Tab */}
      {tab === 'landscape' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* TAM and Growth Rate Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(79,70,229,0.03)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Addressable Market (TAM)</div>
              <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>{landscape.tam_estimate || 'No TAM estimate available.'}</p>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Annual Market Growth Rate</div>
              <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>{landscape.growth_rate || 'No growth rate declared.'}</p>
            </div>
          </div>

          {/* Opportunities vs Threats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>🌟 CORE OPPORTUNITIES</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{landscape.biggest_opportunity}</p>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>⚠️ CRITICAL THREATS</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{landscape.biggest_threat}</p>
            </div>
          </div>

          {/* Market Dynamics */}
          <div>
            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>📈 Key Market Dynamics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {landscape.top_3_dynamics?.map((d, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          </div>

          {/* Regulatory Shifts */}
          {landscape.regulatory_shifts && (
            <div>
              <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>⚖️ Compliance & Regulatory Shifts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {landscape.regulatory_shifts?.map((d, i) => (
                  <div key={i} style={{ background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.15)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Whitespace Tab */}
      {tab === 'whitespace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Crowded vs Underserved */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>❌ CROWDED COMPETITIVE TERRITORIES</div>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                {whitespace.crowded_territories?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>✅ UNDERSERVED OPPORTUNITY TERRITORIES</div>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                {whitespace.underserved_territories?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
          </div>

          {/* Recommended Angles */}
          <div>
            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>🏹 Recommended Differentiation Angles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {whitespace.recommended_angles?.map((angle, i) => (
                <div key={i} style={{ border: '1px solid rgba(79,70,229,0.2)', borderRadius: '12px', background: 'rgba(79,70,229,0.02)', padding: '1.25rem' }}>
                  <div style={{ color: '#a5b4fc', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Angle {i+1}: {angle.angle}</div>
                  <p style={{ color: '#bdc1c6', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 0.5rem 0' }}><strong>Rationale:</strong> {angle.rationale}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {angle.supporting_evidence?.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unmet Pain Points */}
          <div>
            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>💔 Unmet B2B Pain Points</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {whitespace.unmet_pain_points?.map((pt, i) => (
                <div key={i} style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#ccc' }}>
                  ⚠️ {pt}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdCreativeRenderer({ payload }) {
  const [platform, setPlatform] = useState('google');
  const pack = payload?.paid_ad_creative_pack || payload || {};

  // Normalize fields dynamically (handles both nested platforms and flat ad_creatives list)
  let googleList = pack.google_search || [];
  let linkedinList = pack.linkedin_ads || [];
  let metaList = pack.meta_ads || [];

  if (pack.platforms && Array.isArray(pack.platforms)) {
    const gPlat = pack.platforms.find(p => p.platform_id === 'google_search' || p.platform_id === 'google');
    if (gPlat && gPlat.campaigns) {
      googleList = gPlat.campaigns;
    }

    const lPlat = pack.platforms.find(p => p.platform_id === 'linkedin_ads' || p.platform_id === 'linkedin');
    if (lPlat && lPlat.campaigns) {
      linkedinList = lPlat.campaigns;
    }

    const mPlat = pack.platforms.find(p => p.platform_id === 'meta_ads' || p.platform_id === 'meta');
    if (mPlat && mPlat.campaigns) {
      metaList = mPlat.campaigns;
    }
  }

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
                    {(grp.ad_variants || grp.ads || []).map((v, idx) => {
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
                  {(grp.ad_variants || grp.ads || []).map((v, idx) => (
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
                  {(grp.ad_variants || grp.ads || []).map((v, idx) => (
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

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the generated output for ${activeTab}? This will remove it from the workspace.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/outputs/${tenant}/${cycle}/${activeTab}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(data.message);
        const updatedOutputs = outputs.filter(o => o.agent !== activeTab);
        setOutputs(updatedOutputs);
        if (updatedOutputs.length > 0) {
          setActiveTab(updatedOutputs[0].agent);
        } else {
          setActiveTab(null);
        }
      } else {
        alert(data.error || 'Failed to delete output');
      }
    } catch (e) {
      alert('Network error. Failed to delete output.');
    }
  };

  useEffect(() => { if (tenant) fetchOutputs(); }, [tenant, cycle]);

  const activeOutput = outputs.find(o => o.agent === activeTab);
  const cfg = CONTENT_TYPES[activeTab] || { label: activeTab, color: '#999', bg: 'rgba(255,255,255,0.05)' };

  const renderPayload = (agent, rawPayload) => {
    let payload = rawPayload;
    if (!payload) return <p style={{ color: 'var(--text-secondary)' }}>No content available.</p>;

    // Robust client-side JSON extractor & parser
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      const firstCurly = trimmed.indexOf('{');
      const lastCurly = trimmed.lastIndexOf('}');
      const firstBracket = trimmed.indexOf('[');
      const lastBracket = trimmed.lastIndexOf(']');

      let potentialJson = null;
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        potentialJson = trimmed.substring(firstCurly, lastCurly + 1);
      } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        potentialJson = trimmed.substring(firstBracket, lastBracket + 1);
      }

      if (potentialJson) {
        try {
          payload = JSON.parse(potentialJson);
        } catch (e) {
          try {
            const cleanJson = potentialJson
              .replace(/[\u201C\u201D]/g, '"')
              .replace(/[\u2018\u2019]/g, "'");
            payload = JSON.parse(cleanJson);
          } catch (err) {}
        }
      }
    }

    payload = normalizePayloadKeys(payload);

    if (typeof payload === 'string') {
      return <MarkdownRenderer text={payload} />;
    }

    if (agent === 'audience_intelligence' || payload.personas) {
      return <AudienceIntelligenceRenderer payload={payload} />;
    }

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

    if (agent === 'market_research' || payload.competitors || payload['market landscape'] || payload['positioning whitespace']) {
      return <MarketResearchRenderer payload={payload} />;
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
    const formatValueText = (text) => {
      if (!text) return '';
      const txt = String(text);
      let formatted = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const terms = [
        'Total Addressable Market', 'target audience', 'positioning statement', 'competitive advantages',
        'lead generation', 'value proposition', 'conversion rate', 'customer acquisition cost',
        'digital footprint', 'organic traffic', 'marketing channel', 'email campaign', 'search ads',
        'project velocity', 'decision cycles', 'project visibility', 'scattered communication',
        'roadblocks', 'workflow', 'deliverables', 'stakeholder communication', 'proof points',
        'messaging matrix', 'value props'
      ];
      terms.forEach(t => {
        const regex = new RegExp(`\\b(${t})\\b`, 'gi');
        formatted = formatted.replace(regex, '<span style="color: var(--accent); font-weight: 600;">$1</span>');
      });
      return formatted;
    };

    const renderSmartObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return <p style={{ color: '#ccc', fontSize: '0.92rem', lineHeight: '1.7', margin: '0.5rem 0' }} dangerouslySetInnerHTML={{ __html: formatValueText(obj) }} />;
      }

      if (Array.isArray(obj)) {
        // Detect if array contains keyword elements
        const firstItem = obj[0];
        if (firstItem && typeof firstItem === 'object' && (firstItem.term || firstItem.keyword || firstItem.keyword_term)) {
          const headers = ['Keyword / Search Term', 'Monthly Volume', 'Difficulty (KD)', 'Search Intent'];
          return (
            <div style={{ overflowX: 'auto', margin: '1rem 0', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#bdc1c6', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {headers.map((h, idx) => <th key={idx} style={{ padding: '0.5rem 0.75rem', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {obj.map((item, idx) => {
                    const normItem = normalizePayloadKeys(item);
                    const keywordVal = normItem.term || normItem.keyword || normItem.keyword_term || '—';
                    const volumeVal = normItem.volume || normItem.search_volume || normItem.monthly_volume || '—';
                    const diffVal = normItem.difficulty || normItem.seo_difficulty || normItem.kd || '—';
                    const intentVal = normItem.intent || normItem.search_intent || normItem.funnel_stage || '—';
                    return (
                      <tr key={idx} style={{ borderBottom: idx < obj.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'white' }}>🔑 {keywordVal}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{volumeVal}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px', 
                            background: typeof diffVal === 'number' && diffVal > 50 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
                            color: typeof diffVal === 'number' && diffVal > 50 ? '#ef4444' : '#10b981' 
                          }}>
                            {diffVal}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ background: 'rgba(79,70,229,0.15)', color: '#a5b4fc', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                            {String(intentVal).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        const isAllPrimitives = obj.every(item => typeof item !== 'object');
        if (isAllPrimitives) {
          const joinedParagraph = obj.map(item => {
            let s = String(item).trim();
            if (s && !/[.!?]$/.test(s)) s += '.';
            return s;
          }).join(' ');
          return (
            <p 
              style={{ color: '#bdc1c6', fontSize: '0.92rem', lineHeight: '1.7', margin: '0.5rem 0', textAlign: 'left' }}
              dangerouslySetInnerHTML={{ __html: formatValueText(joinedParagraph) }}
            />
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.75rem' }}>
            {obj.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1.5rem', borderLeft: '3px solid var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {renderSmartObject(item)}
              </div>
            ))}
          </div>
        );
      }

      const entries = Object.entries(obj).filter(([key]) => {
        return key !== 'schema_version' && key !== 'written_by_agent' && key !== 'written_at' && key !== 'tenant_id' && key !== 'cycle_id';
      });

      const titleEntry = entries.find(([key]) => key.toLowerCase() === 'title' || key.toLowerCase() === 'name');
      const descEntry = entries.find(([key]) => key.toLowerCase().includes('description') || key.toLowerCase() === 'summary' || key.toLowerCase().includes('statement') || key.toLowerCase() === 'message' || key.toLowerCase() === 'pov_statement');
      
      const otherEntries = entries.filter(([key]) => key !== titleEntry?.[0] && key !== descEntry?.[0]);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          {(titleEntry || descEntry) && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem', marginBottom: '0.5rem' }}>
              {titleEntry && (
                <h3 style={{ color: 'white', fontSize: '1.35rem', fontWeight: 600, margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  {String(titleEntry[1])}
                </h3>
              )}
              {descEntry && (
                <p style={{ color: '#eaf1ff', fontSize: '0.98rem', lineHeight: '1.7', margin: 0, fontWeight: 400 }} dangerouslySetInnerHTML={{ __html: formatValueText(descEntry[1]) }} />
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {otherEntries.map(([key, val]) => {
              const displayKey = key.replace(/_/g, ' ').toUpperCase();
              const isComplex = typeof val === 'object' && val !== null;

              if (!isComplex && (key.toLowerCase().endsWith('id') || key.toLowerCase() === 'type' || key.toLowerCase() === 'channel' || key.toLowerCase() === 'funnel_stage' || key.toLowerCase() === 'priority')) {
                return (
                  <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#888' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{displayKey}:</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#ccc' }}>{String(val)}</span>
                  </div>
                );
              }

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {displayKey}
                  </span>
                  <div>
                    {isComplex ? renderSmartObject(val) : (
                      <p style={{ color: '#bdc1c6', fontSize: '0.92rem', lineHeight: '1.7', margin: 0 }} dangerouslySetInnerHTML={{ __html: formatValueText(val) }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(activeOutput.payload, null, 2))} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    📋 Copy
                  </button>
                  <button onClick={handleDelete} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    🗑️ Delete Output
                  </button>
                </div>
              </div>
              {renderPayload(activeTab, activeOutput.payload)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

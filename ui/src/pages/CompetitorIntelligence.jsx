import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Award, Target, Zap, Shield, DollarSign, Globe, ChevronDown, ChevronUp, Copy, CheckCircle, AlertTriangle, BarChart3, Users, Sparkles } from 'lucide-react';

const LOADING_STAGES = [
  { label: 'Researching market landscape', icon: '🔍', duration: 3000 },
  { label: 'Identifying top competitors', icon: '🏢', duration: 4000 },
  { label: 'Analyzing features & pricing', icon: '📊', duration: 5000 },
  { label: 'Scoring & ranking providers', icon: '⚡', duration: 4000 },
  { label: 'Generating executive report', icon: '📋', duration: 3000 },
];

const SCORE_LABELS = {
  features: { label: 'Features', icon: <Zap size={14} />, color: '#818cf8' },
  ease_of_use: { label: 'Ease of Use', icon: <Users size={14} />, color: '#34d399' },
  pricing_value: { label: 'Value', icon: <DollarSign size={14} />, color: '#fbbf24' },
  support: { label: 'Support', icon: <Shield size={14} />, color: '#f472b6' },
  scalability: { label: 'Scale', icon: <TrendingUp size={14} />, color: '#60a5fa' },
  innovation: { label: 'Innovation', icon: <Sparkles size={14} />, color: '#a78bfa' },
};

const POSITION_COLORS = {
  Leader: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#34d399' },
  Challenger: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#60a5fa' },
  Niche: { bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.25)', text: '#fbbf24' },
  Emerging: { bg: 'rgba(167, 139, 250, 0.08)', border: 'rgba(167, 139, 250, 0.25)', text: '#a78bfa' },
};

const EXAMPLE_QUERIES = [
  'Identity and Access Management (IAM)',
  'Cloud Security (CSPM / CNAPP)',
  'SIEM & Threat Detection',
  'Endpoint Detection & Response (EDR)',
  'Data Loss Prevention (DLP)',
  'API Security',
  'Zero Trust Network Access (ZTNA)',
  'Vulnerability Management',
];

function ScoreBar({ score, color, animated, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setWidth(score), delay || 100);
      return () => clearTimeout(timer);
    } else {
      setWidth(score);
    }
  }, [score, animated, delay]);

  return (
    <div className="ci-score-bar-track">
      <div
        className="ci-score-bar-fill"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <span className="ci-score-bar-value">{score}</span>
    </div>
  );
}

function CompetitorCard({ competitor, index, isExpanded, onToggle }) {
  const posStyle = POSITION_COLORS[competitor.market_position] || POSITION_COLORS.Emerging;

  return (
    <div
      className="ci-competitor-card"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Rank badge */}
      <div className="ci-rank-badge">#{competitor.rank}</div>

      {/* Header */}
      <div className="ci-card-header-row">
        <div className="ci-company-avatar" style={{ background: `linear-gradient(135deg, ${posStyle.text}33, ${posStyle.text}11)`, borderColor: posStyle.border }}>
          {competitor.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="ci-company-name">{competitor.name}</h3>
          <p className="ci-company-desc">{competitor.description}</p>
        </div>
      </div>

      {/* Score ring */}
      <div className="ci-overall-score-section">
        <div className="ci-score-ring" style={{ '--score-color': posStyle.text }}>
          <svg viewBox="0 0 80 80" className="ci-score-svg">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={posStyle.text}
              strokeWidth="5"
              strokeDasharray={`${(competitor.overall_score / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              className="ci-score-circle-animated"
            />
          </svg>
          <span className="ci-score-number">{competitor.overall_score}</span>
        </div>
        <div>
          <span className="ci-position-badge" style={{ background: posStyle.bg, border: `1px solid ${posStyle.border}`, color: posStyle.text }}>
            {competitor.market_position}
          </span>
          <div className="ci-pricing-label">{competitor.pricing_tier} · {competitor.pricing_range}</div>
        </div>
      </div>

      {/* Score bars */}
      <div className="ci-scores-grid">
        {Object.entries(SCORE_LABELS).map(([key, meta], i) => (
          <div key={key} className="ci-score-row">
            <div className="ci-score-label">
              {meta.icon}
              <span>{meta.label}</span>
            </div>
            <ScoreBar score={competitor.scores?.[key] || 0} color={meta.color} animated delay={200 + i * 100} />
          </div>
        ))}
      </div>

      {/* Strengths & weaknesses */}
      <div className="ci-strengths-section">
        <div className="ci-sw-col">
          <div className="ci-sw-title" style={{ color: '#34d399' }}>✦ Strengths</div>
          {competitor.key_strengths?.map((s, i) => (
            <div key={i} className="ci-sw-item ci-strength">{s}</div>
          ))}
        </div>
        <div className="ci-sw-col">
          <div className="ci-sw-title" style={{ color: '#f87171' }}>✦ Weaknesses</div>
          {competitor.key_weaknesses?.map((w, i) => (
            <div key={i} className="ci-sw-item ci-weakness">{w}</div>
          ))}
        </div>
      </div>

      {/* Expandable detail */}
      <button className="ci-expand-btn" onClick={() => onToggle(index)}>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {isExpanded ? 'Less detail' : 'More detail'}
      </button>

      {isExpanded && (
        <div className="ci-expanded-detail">
          <div className="ci-detail-row">
            <span className="ci-detail-label">Founded</span>
            <span>{competitor.founded}</span>
          </div>
          <div className="ci-detail-row">
            <span className="ci-detail-label">HQ</span>
            <span>{competitor.headquarters}</span>
          </div>
          <div className="ci-detail-row">
            <span className="ci-detail-label">Best For</span>
            <span>{competitor.best_for}</span>
          </div>
          <div className="ci-detail-row">
            <span className="ci-detail-label">Notable Clients</span>
            <span>{competitor.notable_clients?.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompetitorIntelligence() {
  const [service, setService] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [activeTab, setActiveTab] = useState('cards');
  const [copied, setCopied] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Animate through loading stages
  useEffect(() => {
    if (!isLoading) return;
    setLoadingStage(0);
    let stage = 0;
    const intervals = [];

    const advanceStage = () => {
      stage++;
      if (stage < LOADING_STAGES.length) {
        setLoadingStage(stage);
        intervals.push(setTimeout(advanceStage, LOADING_STAGES[stage].duration));
      }
    };

    intervals.push(setTimeout(advanceStage, LOADING_STAGES[0].duration));
    return () => intervals.forEach(clearTimeout);
  }, [isLoading]);

  const handleSearch = async () => {
    if (!service.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setExpandedCards({});
    setShowSuggestions(false);

    try {
      const res = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: service.trim(),
          industry: industry.trim() || undefined,
          region: region.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      } else {
        setError(data.error || 'Analysis failed. Please try again.');
      }
    } catch (e) {
      setError('Network error — is the backend running on port 3001?');
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleCard = (idx) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyReport = () => {
    if (!result) return;
    const a = result.analysis;
    let text = `COMPETITOR INTELLIGENCE REPORT\n`;
    text += `Service: ${result.query.service}\n`;
    text += `Generated: ${result.generated_at}\n\n`;
    text += `== MARKET OVERVIEW ==\n`;
    text += `Market: ${a.market_overview?.market_name}\n`;
    text += `Size: ${a.market_overview?.estimated_market_size}\n`;
    text += `Growth: ${a.market_overview?.projected_growth}\n`;
    text += `Maturity: ${a.market_overview?.market_maturity}\n`;
    text += `Trends: ${a.market_overview?.key_trends?.join(', ')}\n\n`;
    text += `== COMPETITORS ==\n`;
    a.competitors?.forEach(c => {
      text += `\n#${c.rank} ${c.name} (Score: ${c.overall_score}/100)\n`;
      text += `  Position: ${c.market_position} | Pricing: ${c.pricing_tier} — ${c.pricing_range}\n`;
      text += `  ${c.description}\n`;
      text += `  Strengths: ${c.key_strengths?.join(', ')}\n`;
      text += `  Weaknesses: ${c.key_weaknesses?.join(', ')}\n`;
      text += `  Best For: ${c.best_for}\n`;
    });
    text += `\n== RECOMMENDATION ==\n`;
    text += `Top Pick: ${a.recommendation?.top_pick} — ${a.recommendation?.top_pick_reason}\n`;
    text += `Best Value: ${a.recommendation?.best_value} — ${a.recommendation?.best_value_reason}\n`;
    text += `Best Enterprise: ${a.recommendation?.best_for_enterprise}\n`;
    text += `Best SMB: ${a.recommendation?.best_for_smb}\n`;
    text += `\nSummary: ${a.recommendation?.summary}\n`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const analysis = result?.analysis;

  return (
    <div className="ci-page">
      {/* ===== HERO SEARCH SECTION ===== */}
      <div className="ci-hero">
        <div className="ci-hero-glow" />
        <div className="ci-hero-content">
          <div className="ci-hero-badge">
            <Sparkles size={14} />
            <span>AI-Powered Competitive Intelligence</span>
          </div>
          <h1 className="ci-hero-title">
            Research any service.<br />
            <span className="ci-hero-gradient">Analyze the competition.</span>
          </h1>
          <p className="ci-hero-subtitle">
            Enter a service or capability below. Our AI agent will identify top providers,
            compare their features, pricing, and capabilities, and deliver an executive-ready report.
          </p>

          {/* Search bar */}
          <div className="ci-search-container" ref={searchRef}>
            <div className="ci-search-bar">
              <Search size={20} className="ci-search-icon" />
              <input
                id="ci-service-input"
                type="text"
                className="ci-search-input"
                placeholder="e.g. Identity and Access Management, SIEM, API Security..."
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  setShowSuggestions(e.target.value.length === 0);
                }}
                onFocus={() => { if (!service) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
              />
              <button
                id="ci-search-btn"
                className="ci-search-btn"
                onClick={handleSearch}
                disabled={isLoading || !service.trim()}
              >
                {isLoading ? (
                  <div className="ci-spinner" />
                ) : (
                  <>Analyze</>
                )}
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && (
              <div className="ci-suggestions">
                <div className="ci-suggestions-title">Popular searches</div>
                <div className="ci-suggestions-grid">
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      className="ci-suggestion-chip"
                      onMouseDown={() => { setService(q); setShowSuggestions(false); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional filters */}
          <div className="ci-filters-row">
            <div className="ci-filter">
              <label htmlFor="ci-industry">Industry</label>
              <input
                id="ci-industry"
                type="text"
                className="glass-input ci-filter-input"
                placeholder="e.g. Healthcare, Finance..."
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="ci-filter">
              <label htmlFor="ci-region">Region</label>
              <input
                id="ci-region"
                type="text"
                className="glass-input ci-filter-input"
                placeholder="e.g. North America, EU..."
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== LOADING STATE ===== */}
      {isLoading && (
        <div className="ci-loading-section">
          <div className="ci-loading-card glass-card">
            <div className="ci-loading-pulse" />
            <h3 className="ci-loading-title">AI Agent is analyzing the competitive landscape...</h3>
            <div className="ci-loading-stages">
              {LOADING_STAGES.map((stage, i) => (
                <div
                  key={i}
                  className={`ci-loading-stage ${i < loadingStage ? 'done' : i === loadingStage ? 'active' : 'pending'}`}
                >
                  <div className="ci-stage-indicator">
                    {i < loadingStage ? (
                      <CheckCircle size={18} />
                    ) : i === loadingStage ? (
                      <div className="ci-stage-spinner" />
                    ) : (
                      <div className="ci-stage-dot" />
                    )}
                  </div>
                  <span className="ci-stage-icon">{stage.icon}</span>
                  <span className="ci-stage-label">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ERROR STATE ===== */}
      {error && (
        <div className="ci-error-card glass-card">
          <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          <span>{error}</span>
        </div>
      )}

      {/* ===== RESULTS ===== */}
      {analysis && (
        <div className="ci-results" ref={resultsRef}>
          {/* Results header */}
          <div className="ci-results-header">
            <div>
              <h2 className="ci-results-title">
                Competitive Landscape: <span className="ci-highlight">{result.query.service}</span>
              </h2>
              <p className="ci-results-meta">
                {result.query.industry} · {result.query.region} · Generated {new Date(result.generated_at).toLocaleString()}
              </p>
            </div>
            <button
              className={`ci-copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyReport}
            >
              {copied ? <><CheckCircle size={16} /> Copied!</> : <><Copy size={16} /> Export Report</>}
            </button>
          </div>

          {/* Market Overview */}
          {analysis.market_overview && (
            <div className="ci-market-overview glass-card">
              <div className="ci-mo-header">
                <Globe size={20} style={{ color: '#818cf8' }} />
                <h3>Market Overview</h3>
              </div>
              <div className="ci-mo-grid">
                <div className="ci-mo-stat">
                  <div className="ci-mo-stat-label">Market</div>
                  <div className="ci-mo-stat-value">{analysis.market_overview.market_name}</div>
                </div>
                <div className="ci-mo-stat">
                  <div className="ci-mo-stat-label">Market Size</div>
                  <div className="ci-mo-stat-value ci-mo-highlight">{analysis.market_overview.estimated_market_size}</div>
                </div>
                <div className="ci-mo-stat">
                  <div className="ci-mo-stat-label">Growth Rate</div>
                  <div className="ci-mo-stat-value ci-mo-highlight">{analysis.market_overview.projected_growth}</div>
                </div>
                <div className="ci-mo-stat">
                  <div className="ci-mo-stat-label">Maturity</div>
                  <div className="ci-mo-stat-value">{analysis.market_overview.market_maturity}</div>
                </div>
              </div>
              {analysis.market_overview.key_trends?.length > 0 && (
                <div className="ci-trends">
                  <div className="ci-trends-label"><TrendingUp size={14} /> Key Trends</div>
                  <div className="ci-trends-list">
                    {analysis.market_overview.key_trends.map((t, i) => (
                      <span key={i} className="ci-trend-chip">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="ci-tabs">
            <button className={`ci-tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
              <BarChart3 size={16} /> Competitor Cards
            </button>
            <button className={`ci-tab ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>
              <Target size={16} /> Feature Matrix
            </button>
          </div>

          {/* Competitor Cards */}
          {activeTab === 'cards' && analysis.competitors && (
            <div className="ci-cards-grid">
              {analysis.competitors.map((comp, i) => (
                <CompetitorCard
                  key={i}
                  competitor={comp}
                  index={i}
                  isExpanded={!!expandedCards[i]}
                  onToggle={toggleCard}
                />
              ))}
            </div>
          )}

          {/* Feature Matrix */}
          {activeTab === 'matrix' && analysis.feature_matrix && (
            <div className="ci-matrix-wrapper glass-card">
              <div className="ci-matrix-scroll">
                <table className="ci-matrix-table">
                  <thead>
                    <tr>
                      <th className="ci-matrix-header-cell sticky-col">Company</th>
                      {analysis.feature_matrix.features?.map((f, i) => (
                        <th key={i} className="ci-matrix-header-cell">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysis.feature_matrix.matrix || {}).map(([company, values], ri) => (
                      <tr key={ri} className="ci-matrix-row">
                        <td className="ci-matrix-company sticky-col">{company}</td>
                        {values.map((v, ci) => (
                          <td key={ci} className={`ci-matrix-cell ${v === '✅' ? 'yes' : v === '❌' ? 'no' : 'partial'}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {analysis.recommendation && (
            <div className="ci-recommendation glass-card">
              <div className="ci-rec-glow" />
              <div className="ci-rec-header">
                <Award size={22} style={{ color: '#fbbf24' }} />
                <h3>AI Recommendation</h3>
              </div>
              <p className="ci-rec-summary">{analysis.recommendation.summary}</p>
              <div className="ci-rec-grid">
                <div className="ci-rec-item ci-rec-top">
                  <div className="ci-rec-badge">🏆 Top Pick</div>
                  <div className="ci-rec-company">{analysis.recommendation.top_pick}</div>
                  <p className="ci-rec-reason">{analysis.recommendation.top_pick_reason}</p>
                </div>
                <div className="ci-rec-item ci-rec-value">
                  <div className="ci-rec-badge">💰 Best Value</div>
                  <div className="ci-rec-company">{analysis.recommendation.best_value}</div>
                  <p className="ci-rec-reason">{analysis.recommendation.best_value_reason}</p>
                </div>
                <div className="ci-rec-item">
                  <div className="ci-rec-badge">🏢 Best Enterprise</div>
                  <div className="ci-rec-company">{analysis.recommendation.best_for_enterprise}</div>
                </div>
                <div className="ci-rec-item">
                  <div className="ci-rec-badge">🚀 Best for SMB</div>
                  <div className="ci-rec-company">{analysis.recommendation.best_for_smb}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

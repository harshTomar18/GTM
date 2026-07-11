import { useState } from 'react';

const ARCHITECTURE_TIERS = [
  {
    id: 'ui',
    title: '1. User Interface Layer',
    badge: 'UX',
    desc: 'The user interaction interface combining command-line prompts, web-based React dashboard panels, and the AskUserQuestion interface.',
    details: 'Express APIs bridges the front-end to YAML/JSON assets on disk, providing human governance controls.',
    files: ['ui/src/pages/*', 'ui/src/components/*']
  },
  {
    id: 'commands',
    title: '2. Slash Command Layer',
    badge: 'CLI Entrypoints',
    desc: 'User-facing commands matching CLI conventions that act as entrypoints for workflows.',
    details: 'These commands are parsed by the backend and routed to relevant skill prompt executors.',
    files: ['.claude/commands/gtm-tenant-init.md', '.claude/commands/gtm-cycle-start.md', '.claude/commands/gtm-agent-run.md']
  },
  {
    id: 'skills',
    title: '3. Skill Executor Layer',
    badge: 'Logic',
    desc: 'Automated recipes telling the AI how to handle file operations, validate schemas, and manage context.',
    details: 'Skills are modular prompts that coordinate inputs/outputs and enforce strict constraints.',
    files: ['.claude/skills/gtm-agent-run/SKILL.md', '.claude/skills/gtm-policy-match/SKILL.md', '.claude/skills/gtm-context-bus/SKILL.md']
  },
  {
    id: 'agents',
    title: '4. Agent Workspace Layer',
    badge: 'Playbooks',
    desc: 'A set of 27 custom marketing agents spanning 5 phases, each with specialized spec schemas and rubrics.',
    details: 'Each agent is structured in a separate folder containing its specs, prompts, questions, and evaluation criteria.',
    files: ['agents/phase1_research/*', 'agents/phase2_narrative/*', 'agents/phase3_assets/*']
  },
  {
    id: 'persistence',
    title: '5. Persistence Layer (Filesystem)',
    badge: 'Database',
    desc: 'No heavy databases. Every piece of state is stored on disk in structured files (YAML, JSON, Markdown).',
    details: 'Follows a strict 4-tier memory hierarchy: Tenant Profile (T1) -> Cycle Scope (T2) -> Run Scope (T3) -> Conversation Scope (T4).',
    files: ['tenants/<tenant_id>/tenant_profile.yaml', 'tenants/<tenant_id>/cycles/<cycle_id>/*']
  }
];

export default function SystemCoreArchitecture() {
  const [selectedTier, setSelectedTier] = useState('persistence');

  const activeTier = ARCHITECTURE_TIERS.find(t => t.id === selectedTier) || ARCHITECTURE_TIERS[4];

  return (
    <div className="glass-card animated-page" style={{ padding: '2.5rem' }}>
      <h2 style={{ fontSize: '1.75rem', color: 'white', fontWeight: 700, margin: 0 }}>System Core Architecture</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem', marginBottom: '2.5rem' }}>
        Interactive layer diagram showing how commands, execution skills, and the filesystem-as-database stack coordinate.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Clickable Diagram */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ARCHITECTURE_TIERS.map((tier) => (
            <div 
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              style={{
                padding: '1.25rem 1.5rem',
                background: selectedTier === tier.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)',
                border: `1px solid ${selectedTier === tier.id ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseOver={e => { if (selectedTier !== tier.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              onMouseOut={e => { if (selectedTier !== tier.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
            >
              <div>
                <span style={{ fontWeight: 600, color: selectedTier === tier.id ? '#a5b4fc' : 'white', fontSize: '0.95rem' }}>
                  {tier.title}
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tier.desc}
                </p>
              </div>
              <span style={{ 
                backgroundColor: selectedTier === tier.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', 
                color: selectedTier === tier.id ? '#a5b4fc' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '4px'
              }}>
                {tier.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Dynamic Detail Viewer */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '2rem', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white', fontWeight: 700, margin: 0 }}>
                {activeTier.title.substring(3)}
              </h3>
              <span className="status-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', fontSize: '0.75rem' }}>
                {activeTier.badge}
              </span>
            </div>

            <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {activeTier.desc}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Technical Details</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                {activeTier.details}
              </p>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>Related Files / Paths:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {activeTier.files.map((file, i) => (
                <code key={i} style={{ padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '0.75rem', color: '#f87171', wordBreak: 'break-all' }}>
                  {file}
                </code>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

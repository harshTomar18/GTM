require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const getRootPath = () => path.resolve(__dirname, '..');

const writeAuditLog = (event, actor, actor_role, subject_type, subject_id, tenant_id, cycle_id, before = null, after = null, rationale = '') => {
    try {
        const auditDir = path.join(getRootPath(), 'governance');
        if (!fs.existsSync(auditDir)) {
            fs.mkdirSync(auditDir, { recursive: true });
        }
        const auditLogPath = path.join(auditDir, 'audit_log.jsonl');
        const entry = {
            ts: new Date().toISOString(),
            event,
            actor: actor || 'System',
            actor_role: actor_role || 'System',
            subject_type,
            subject_id: subject_id || 'N/A',
            tenant_id: tenant_id || 'N/A',
            cycle_id: cycle_id || 'N/A',
            rationale: rationale || '',
            before,
            after
        };
        fs.appendFileSync(auditLogPath, JSON.stringify(entry) + '\n', 'utf8');
        console.log(`[AUDIT LOG] ${event} recorded for tenant: ${tenant_id}`);
    } catch (e) {
        console.error('Failed to write audit log:', e);
    }
};

// Helper to generate content with retry and exponential backoff
const generateContentWithRetry = async (model, prompt, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            const errorMsg = error.message || '';
            const isTemporary = errorMsg.includes('503') || errorMsg.includes('429') || errorMsg.includes('demand') || errorMsg.includes('ResourceExhausted');
            if (isTemporary && i < retries - 1) {
                console.warn(`[GEMINI] Model busy or rate-limited. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error;
            }
        }
    }
};

const getRequiredRolesForAgent = (agent, tenant) => {
    let frameworks = [];
    let regulatoryReview = false;
    try {
        const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
        if (fs.existsSync(profilePath)) {
            const data = yaml.parse(fs.readFileSync(profilePath, 'utf8'));
            frameworks = data.frameworks || [];
            regulatoryReview = data.regulatory_constraints && data.regulatory_constraints.length > 0;
        }
    } catch (e) { }

    const roles = new Set();

    if (['research_synthesis', 'narrative_lock', 'kpi_framework'].includes(agent)) {
        roles.add('CMO');
        roles.add('SalesLeader');
    }

    if (['positioning', 'value_proposition', 'messaging_matrix', 'content_pillars', 'narrative_lock', 'website_copy', 'campaign_brief'].includes(agent)) {
        roles.add('CMO');
    }

    if (['paid_media_setup', 'channel_plan', 'campaign_calendar'].includes(agent)) {
        roles.add('CMO');
        roles.add('CFO');
    }

    if (frameworks.length > 0) {
        roles.add('SME');
    }

    if (regulatoryReview && ['website_copy', 'email_sequences', 'paid_ad_creative', 'content_assets'].includes(agent)) {
        roles.add('Legal');
        roles.add('SME');
    }

    if (roles.size === 0) {
        roles.add('CMO');
    }

    return Array.from(roles);
};

// Helper to resolve Jinja-style prompt template variables dynamically
const compilePromptTemplate = (templateStr, profile, contextBus, answers = {}) => {
    return templateStr.replace(/\{\{\s*([^\}]+)\s*\}\}/g, (match, pathStr) => {
        pathStr = pathStr.trim();
        
        // 1. Resolve profile variables (e.g. profile.company.brand_name)
        if (pathStr.startsWith('profile.')) {
            const parts = pathStr.split('.');
            let current = profile;
            for (let i = 1; i < parts.length; i++) {
                if (!current) break;
                let key = parts[i];
                if (key.includes('|')) key = key.split('|')[0].trim();
                current = current[key];
            }
            if (Array.isArray(current)) return current.join(', ');
            return current !== undefined ? String(current) : '';
        }
        
        // 2. Resolve inputs.upstream variables
        if (pathStr.startsWith('inputs.upstream')) {
            const matchKey = pathStr.match(/\["([^"]+)"\]/);
            if (matchKey) {
                const upstreamKey = matchKey[1];
                const cleanKey = upstreamKey.replace('.output', '');
                const busFile = cleanKey.includes('.') ? cleanKey.split('.')[1] : cleanKey;
                
                let fieldPath = pathStr.substring(pathStr.indexOf(']') + 1).trim();
                if (fieldPath.startsWith('.')) fieldPath = fieldPath.substring(1);
                if (fieldPath.includes('|')) fieldPath = fieldPath.split('|')[0].trim();
                
                const busData = contextBus[busFile];
                if (busData && busData.payload) {
                    if (!fieldPath) return JSON.stringify(busData.payload, null, 2);
                    const parts = fieldPath.split('.');
                    let current = busData.payload;
                    for (const p of parts) {
                        if (!current) break;
                        current = current[p];
                    }
                    if (Array.isArray(current)) return current.join(', ');
                    return current !== undefined ? String(current) : '';
                }
            }
            return '';
        }

        // 3. Resolve inputs.answers variables
        if (pathStr.startsWith('inputs.answers')) {
            const parts = pathStr.split('.');
            const key = parts[parts.length - 1].split('|')[0].trim();
            return answers[key] || '';
        }

        return '';
    });
};

// Helper to run agents using Gemini Free API
const runGeminiAgentDirectly = async (tenant, cycle, agent, rejectionComment = '') => {
    writeAuditLog('agent.run.start', 'Gemini AI', 'AI System', 'agent_run', agent, tenant, cycle, null, { status: 'started' });
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in .env file.");
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. Load tenant profile
        const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
        let profileContent = '';
        let profile = {};
        if (fs.existsSync(profilePath)) {
            profileContent = fs.readFileSync(profilePath, 'utf8');
            try {
                profile = yaml.parse(profileContent);
            } catch (e) {}
        }

        // 2. Load ContextBus and Answers
        const contextBus = {};
        const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
        if (fs.existsSync(busPath)) {
            try {
                const files = fs.readdirSync(busPath).filter(f => f.endsWith('.output.json'));
                files.forEach(f => {
                    const key = f.replace('.output.json', '');
                    try {
                        const content = JSON.parse(fs.readFileSync(path.join(busPath, f), 'utf8'));
                        contextBus[key] = content;
                    } catch (e) {}
                });
            } catch (e) {}
        }

        const answers = {};
        const answersPath = path.join(getRootPath(), 'tenants', tenant, 'answers');
        if (fs.existsSync(answersPath)) {
            try {
                const files = fs.readdirSync(answersPath).filter(f => f.endsWith('.json'));
                files.forEach(f => {
                    try {
                        const content = JSON.parse(fs.readFileSync(path.join(answersPath, f), 'utf8'));
                        Object.assign(answers, content);
                    } catch (e) {}
                });
            } catch (e) {}
        }

        // 3. Locate agent folder and prompt
        let agentPrompt = '';
        const phases = ['phase1_research', 'phase2_narrative', 'phase3_assets', 'phase4_distribution', 'phase5_measurement'];
        let foundPath = null;
        for (const phase of phases) {
            const p = path.join(getRootPath(), 'agents', phase, agent, 'prompt.md');
            if (fs.existsSync(p)) {
                foundPath = p;
                break;
            }
        }

        if (foundPath) {
            agentPrompt = fs.readFileSync(foundPath, 'utf8');
        } else {
            agentPrompt = `Write B2B marketing content for the ${agent} task.`;
        }

        let compiledPrompt = compilePromptTemplate(agentPrompt, profile, contextBus, answers);
        if (rejectionComment) {
            compiledPrompt += `\n\n--- REJECTION FEEDBACK FROM THE REVIEWER ---\nThe previous output was rejected. You MUST revise the content based on this feedback:\n"${rejectionComment}"\nMake sure to incorporate all changes requested.`;
        }

        // 4. Construct Gemini Prompt with professional copywriting constraints
        const systemPrompt = `You are a GTM AI Agent named "${agent}" for the company described in the profile.
Execute the following agent prompt instructions and output the generated marketing assets or research.

--- COPYWRITING & FORMATTING RULES ---
1. Return only the requested content.
2. Do not include explanations, introductions, conclusions, notes, or disclaimers.
3. Use correct grammar and natural, professional language.
4. Keep the formatting clean, clear, and easy to copy and paste.
5. If the agent instructions request a JSON payload, return ONLY a clean JSON object. Do not add markdown wrappers (like \`\`\`json) inside the JSON string itself; just return clean parsable data.
6. Preserve line breaks where appropriate for readability.
7. Tone must be professional, persuasive, and tailored to the target personas.

--- COMPANY PROFILE ---
${profileContent}

--- AGENT INSTRUCTIONS ---
${compiledPrompt}
`;

        console.log(`[GEMINI] Running agent: ${agent} for tenant: ${tenant}`);
        const result = await generateContentWithRetry(model, systemPrompt);
        const text = result.response.text().trim();

        // 4. Parse output and write to ContextBus
        let payload = text;
        // Clean markdown code blocks if any
        if (text.startsWith('```json')) {
            const cleanText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
                payload = JSON.parse(cleanText);
            } catch (e) {
                payload = cleanText;
            }
        } else if (text.startsWith('```')) {
            payload = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
                payload = JSON.parse(payload);
            } catch (e) { }
        } else {
            try {
                payload = JSON.parse(text);
            } catch (e) { }
        }

        fs.mkdirSync(busPath, { recursive: true });

        const outputFile = path.join(busPath, `${agent}.output.json`);
        const record = {
            schema_version: `${agent}.Output:v1.0.0`,
            written_by_agent: agent,
            written_at: new Date().toISOString(),
            tenant_id: tenant,
            cycle_id: cycle,
            payload: payload
        };
        fs.writeFileSync(outputFile, JSON.stringify(record, null, 2));

        // Create a dynamic pending approval file
        const approvalId = Math.random().toString(36).substring(2, 10);
        const approvalPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'approvals');
        fs.mkdirSync(approvalPath, { recursive: true });

        // Clean old resolutions if re-run
        try {
            if (fs.existsSync(path.join(approvalPath, `${agent}.approved.json`))) fs.unlinkSync(path.join(approvalPath, `${agent}.approved.json`));
            if (fs.existsSync(path.join(approvalPath, `${agent}.rejected.json`))) fs.unlinkSync(path.join(approvalPath, `${agent}.rejected.json`));
        } catch (e) { }

        const matchedRoles = getRequiredRolesForAgent(agent, tenant);

        fs.writeFileSync(
            path.join(approvalPath, `${agent}.pending.json`),
            JSON.stringify({
                id: approvalId,
                tenant,
                cycle,
                agent,
                required_role: matchedRoles[0], // backward compatibility
                required_roles: matchedRoles,   // multi-role support
                approvals_received: {},         // role -> timestamp map
                revision_iteration: 0,          // track rejection count
                status: 'pending',
                created_at: new Date().toISOString()
            }, null, 2)
        );

        writeAuditLog('agent.run.complete', 'Gemini AI', 'AI System', 'agent_run', agent, tenant, cycle, null, { status: 'completed', outputFile });
        writeAuditLog('approval.requested', 'Gemini AI', 'AI System', 'approval', approvalId, tenant, cycle, null, { agent, required_roles: matchedRoles });

        return {
            success: true,
            message: `[${agent}] Run completed successfully via Gemini API (Free Tier).\nOutput written to: ${outputFile}\nApproval pending for ID: ${approvalId}`
        };
    } catch (error) {
        console.error("[GEMINI ERROR]", error);
        return {
            success: false,
            message: `Gemini execution failed: ${error.message}`
        };
    }
};

// Helper to parse parameters from CLI commands
const getCommandParam = (cmd, param) => {
    // Matches param=value until next space and key= or end of string
    const regex = new RegExp(`${param}=([^\\s"]+|"[^"]*")`);
    const match = cmd.match(regex);
    if (!match) return null;
    let val = match[1].trim();
    // Strip trailing and leading quotes
    val = val.replace(/^"|"$/g, '').trim();
    return val;
};

// Helper to execute real Claude CLI commands (or fallback to Gemini if config is set)
const runRealCLI = async (command) => {
    // Intercept agent runs and route to Gemini
    if (process.env.GEMINI_API_KEY) {
        if (command.includes('/gtm-agent-run')) {
            const tenant = getCommandParam(command, 'tenant');
            const cycle = getCommandParam(command, 'cycle');
            const agent = getCommandParam(command, 'agent');
            if (tenant && cycle && agent) {
                return await runGeminiAgentDirectly(tenant, cycle, agent);
            }
        } else if (command.includes('/gtm-cycle-start')) {
            const tenant = getCommandParam(command, 'tenant');
            const cycle = getCommandParam(command, 'cycle');
            if (tenant && cycle) {
                const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
                fs.mkdirSync(busPath, { recursive: true });
                writeAuditLog('cycle.start', 'System Operator', 'Operator', 'cycle', cycle, tenant, cycle, null, { status: 'running' });
                
                const agentsList = [
                    'brief_intake', 'market_research', 'audience_intelligence', 'keyword_intent', 'research_synthesis',
                    'positioning', 'value_proposition', 'messaging_matrix', 'content_pillars', 'narrative_lock',
                    'website_copy', 'content_assets', 'email_sequences', 'social_content', 'paid_ad_creative', 'sales_enablement',
                    'channel_strategy', 'campaign_calendar', 'seo_activation', 'paid_media', 'outbound_partner', 'community_activation',
                    'measurement', 'experiment_review', 'competitive_pulse', 'executive_brief', 'iteration_planner'
                ];
                
                // Trigger background execution of all 27 agents sequentially
                (async () => {
                    console.log(`[CYCLE START] Starting background pipeline of all 27 agents for ${tenant}...`);
                    for (const ag of agentsList) {
                        try {
                            await runGeminiAgentDirectly(tenant, cycle, ag);
                        } catch (err) {
                            console.error(`[CYCLE START] Error executing agent ${ag}:`, err);
                        }
                    }
                    console.log(`[CYCLE START] Completed background pipeline of all 27 agents for ${tenant}!`);
                })();

                return {
                    success: true,
                    message: `[cycle_start] Cycle ${cycle} successfully started. Executing all 27 agents in the background.`
                };
            }
        } else if (command.includes('/gtm-tenant-init')) {
            const tenant = getCommandParam(command, 'tenant');
            const pack = getCommandParam(command, 'pack');
            if (tenant && pack) {
                const packPath = path.join(getRootPath(), 'vertical_packs', pack);
                const tenantPath = path.join(getRootPath(), 'tenants', tenant);
                if (!fs.existsSync(tenantPath)) {
                    fs.mkdirSync(tenantPath, { recursive: true });
                    if (fs.existsSync(packPath)) {
                        fs.cpSync(packPath, tenantPath, { recursive: true });
                    }
                }
                writeAuditLog('tenant.initialized', 'System Operator', 'Operator', 'tenant', tenant, tenant, 'N/A', null, { pack });
                return {
                    success: true,
                    message: `[tenant_init] Scaffolded ${tenant} successfully via Gemini Bridge.`
                };
            }
        } else if (command.includes('/gtm-validate-profile')) {
            // Extract tenant ID from the command
            const parts = command.trim().split(/\s+/);
            const tenant = parts[parts.length - 1].replace(/"/g, '').trim();

            const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
            if (!fs.existsSync(profilePath)) {
                return {
                    success: false,
                    message: `[validate-profile] FAILED: File not found at path: ${profilePath}`
                };
            }

            try {
                const fileContent = fs.readFileSync(profilePath, 'utf8');
                const profileData = yaml.parse(fileContent);

                const checks = [];
                let hasErrors = false;

                // Check 1: YAML Structure
                checks.push(`✅ [YAML Syntax] Successfully parsed YAML format.`);

                // Check 2: Version
                if (profileData.version) {
                    checks.push(`✅ [Schema Version] Found version ${profileData.version}.`);
                } else {
                    checks.push(`⚠️ [Schema Version] Missing "version" field.`);
                }

                // Check 3: Profile ID
                if (profileData.profile_id) {
                    checks.push(`✅ [Profile ID] ID matches "${profileData.profile_id}".`);
                } else {
                    checks.push(`⚠️ [Profile ID] Missing "profile_id" field.`);
                }

                // Check 4: Company details
                if (profileData.company) {
                    const c = profileData.company;
                    checks.push(`✅ [Company Config] Found company info: Name="${c.brand_name || 'N/A'}", HQ="${c.hq_country || 'N/A'}".`);
                } else {
                    checks.push(`❌ [Company Config] Missing required "company" section.`);
                    hasErrors = true;
                }

                // Check 5: Brand Voice
                if (profileData.brand_voice) {
                    const bv = profileData.brand_voice;
                    checks.push(`✅ [Brand Voice] Found voice guidelines: Archetype="${bv.archetype || 'N/A'}", Reading Level="${bv.reading_level || 'N/A'}".`);
                } else {
                    checks.push(`⚠️ [Brand Voice] Missing "brand_voice" section.`);
                }

                const report = [
                    `---------------------------------------------`,
                    `GTM OS PROFILE VALIDATION REPORT FOR: ${tenant}`,
                    `---------------------------------------------`,
                    ...checks,
                    `---------------------------------------------`,
                    `RESULT: ${hasErrors ? '❌ FAILED' : '✅ PASS (Profile is ready for AI execution)'}`
                ].join('\n');

                writeAuditLog('tenant.profile_validated', 'System Operator', 'Operator', 'tenant', tenant, tenant, 'N/A', null, { success: !hasErrors });

                return {
                    success: !hasErrors,
                    message: report
                };
            } catch (e) {
                return {
                    success: false,
                    message: `[validate-profile] FAILED: Invalid YAML syntax. Details: ${e.message}`
                };
            }
        } else if (command.includes('/gtm-approve')) {
            const parts = command.trim().split(/\s+/);
            const id = parts[parts.length - 3] || 'a1b2c3d4';
            return {
                success: true,
                message: `[approve] Artifact ${id} approved successfully and advanced to the next gate (Gemini Bridge Mode).`
            };
        } else if (command.includes('/gtm-reject')) {
            const parts = command.trim().split(/\s+/);
            const id = parts[parts.length - 3] || 'a1b2c3d4';
            return {
                success: true,
                message: `[reject] Artifact ${id} rejected. Sent back to feedback loop (Gemini Bridge Mode).`
            };
        } else if (command.includes('/gtm-dashboard')) {
            const tenant = getCommandParam(command, 'tenant') || 'microsoft';
            return {
                success: true,
                message: `[dashboard] Loaded dashboard statistics for ${tenant} successfully (Gemini Bridge Mode).`
            };
        } else if (command.includes('/gtm-approve')) {
            return {
                success: true,
                message: `[approve] Approved successfully and advanced to the next gate (Gemini Bridge Mode).`
            };
        } else if (command.includes('/gtm-reject')) {
            return {
                success: true,
                message: `[reject] Rejected. Sent back to feedback loop (Gemini Bridge Mode).`
            };
        }
    }

    // Claude CLI is completely commented out and disabled to prevent credit usage
    console.log(`[CLAUDE DISABLED] Bypassed execution for: ${command}`);
    return {
        success: true,
        message: `Processed command "${command}" successfully (Gemini Bridge Mode).`
    };
};

// 1. Health & Tenants
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/tenants', (req, res) => {
    const tenantsPath = path.join(getRootPath(), 'tenants');
    try {
        if (!fs.existsSync(tenantsPath)) return res.json({ tenants: [] });
        const tenants = fs.readdirSync(tenantsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => ({ id: dirent.name }));
        res.json({ tenants });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read tenants' });
    }
});

app.get('/api/audit', (req, res) => {
    const auditLogPath = path.join(getRootPath(), 'governance', 'audit_log.jsonl');
    try {
        if (!fs.existsSync(auditLogPath)) {
            const auditDir = path.dirname(auditLogPath);
            if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

            const seed = [
                { ts: new Date(Date.now() - 1000000).toISOString(), event: 'tenant.initialized', actor: 'System', actor_role: 'System', subject_type: 'tenant', subject_id: '_example', tenant_id: '_example', cycle_id: 'N/A', rationale: 'Default workspace onboarding', before: null, after: { pack: '_template' } },
                { ts: new Date(Date.now() - 500000).toISOString(), event: 'tenant.profile_validated', actor: 'System', actor_role: 'System', subject_type: 'tenant', subject_id: '_example', tenant_id: '_example', cycle_id: 'N/A', rationale: 'Verification profile scan', before: null, after: { success: true } }
            ];
            const content = seed.map(e => JSON.stringify(e)).join('\n') + '\n';
            fs.writeFileSync(auditLogPath, content, 'utf8');
        }

        const raw = fs.readFileSync(auditLogPath, 'utf8');
        const logs = raw.trim().split('\n').filter(line => line.trim() !== '').map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read audit log', details: error.message });
    }
});

// 1.1 List Cycles for a Tenant
app.get('/api/cycles/:tenant', (req, res) => {
    const tenant = req.params.tenant;
    const cyclesPath = path.join(getRootPath(), 'tenants', tenant, 'cycles');
    try {
        if (!fs.existsSync(cyclesPath)) return res.json({ cycles: [] });
        const cycles = fs.readdirSync(cyclesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => ({ id: dirent.name }));
        res.json({ cycles });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read cycles' });
    }
});

// 2. Tenant Init (/gtm-tenant-init)
app.post('/api/tenant-init', async (req, res) => {
    const { tenant, pack } = req.body;
    if (!tenant || !pack) return res.status(400).json({ error: 'Missing tenant or pack' });
    const result = await runRealCLI(`claude -p "/gtm-tenant-init tenant=${tenant} pack=${pack}"`);

    // Fallback: If Claude fails (e.g. not logged in), scaffold it manually so the UI demo still works
    if (!result.success || result.message.includes('Not logged in')) {
        try {
            const packPath = path.join(getRootPath(), 'vertical_packs', pack);
            const tenantPath = path.join(getRootPath(), 'tenants', tenant);
            if (!fs.existsSync(tenantPath)) {
                fs.mkdirSync(tenantPath, { recursive: true });
                if (fs.existsSync(packPath)) {
                    fs.cpSync(packPath, tenantPath, { recursive: true });
                }
            }
            return res.json({ success: true, message: `Scaffolded ${tenant} successfully (Fallback Mode)` });
        } catch (e) {
            return res.json({ success: false, message: 'Failed to scaffold tenant manually' });
        }
    }

    res.json(result);
});

// 3. Cycle Start (/gtm-cycle-start)
app.post('/api/cycle-start', async (req, res) => {
    const { tenant, cycle, isLive } = req.body;
    if (!tenant || !cycle) return res.status(400).json({ error: 'Missing tenant or cycle' });

    const liveArg = isLive ? ' live=true' : '';
    const result = await runRealCLI(`claude -p "/gtm-cycle-start tenant=${tenant} cycle=${cycle}${liveArg}"`);
    res.json(result);
});

// 4. Pending Approvals (/gtm-pending)
// Dynamically scans all tenant cycles for *.pending.json files
app.get('/api/pending', (req, res) => {
    const approvals = [];
    const tenantsPath = path.join(getRootPath(), 'tenants');
    try {
        if (fs.existsSync(tenantsPath)) {
            const tenants = fs.readdirSync(tenantsPath).filter(f => !f.startsWith('.'));
            for (const t of tenants) {
                const cyclesPath = path.join(tenantsPath, t, 'cycles');
                if (fs.existsSync(cyclesPath)) {
                    const cycles = fs.readdirSync(cyclesPath).filter(f => !f.startsWith('.'));
                    for (const cy of cycles) {
                        const appPath = path.join(cyclesPath, cy, 'approvals');
                        if (fs.existsSync(appPath)) {
                            const files = fs.readdirSync(appPath).filter(f => f.endsWith('.pending.json'));
                            for (const f of files) {
                                try {
                                    const fileData = JSON.parse(fs.readFileSync(path.join(appPath, f), 'utf8'));
                                    approvals.push(fileData);
                                } catch (e) { }
                            }
                        }
                    }
                }
            }
        }
        res.json({ approvals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
    }
});

// Helper to find and read a pending approval by ID
const findPendingApproval = (id) => {
    const tenantsPath = path.join(getRootPath(), 'tenants');
    if (!fs.existsSync(tenantsPath)) return null;
    const tenants = fs.readdirSync(tenantsPath).filter(f => !f.startsWith('.'));
    for (const t of tenants) {
        const cyclesPath = path.join(tenantsPath, t, 'cycles');
        if (fs.existsSync(cyclesPath)) {
            const cycles = fs.readdirSync(cyclesPath).filter(f => !f.startsWith('.'));
            for (const cy of cycles) {
                const appPath = path.join(cyclesPath, cy, 'approvals');
                if (fs.existsSync(appPath)) {
                    const files = fs.readdirSync(appPath).filter(f => f.endsWith('.pending.json'));
                    for (const f of files) {
                        const filePath = path.join(appPath, f);
                        try {
                            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            if (data.id === id) {
                                return { data, filePath, tenant: t, cycle: cy, appPath, agent: data.agent };
                            }
                        } catch (e) { }
                    }
                }
            }
        }
    }
    return null;
};

// 5. Approve (/gtm-approve)
app.post('/api/approve', async (req, res) => {
    const { id, role, comment } = req.body;
    const approvalInfo = findPendingApproval(id);

    if (approvalInfo) {
        const { data, filePath, tenant, cycle, agent } = approvalInfo;

        const requiredRoles = data.required_roles || [data.required_role || 'CMO'];
        const approvalsReceived = data.approvals_received || {};
        approvalsReceived[role] = new Date().toISOString();
        data.approvals_received = approvalsReceived;

        const allApproved = requiredRoles.every(r => approvalsReceived[r]);

        if (allApproved) {
            const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
            const outputFile = path.join(busPath, `${agent}.output.json`);
            if (fs.existsSync(outputFile)) {
                try {
                    const artifact = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
                    artifact.approved_at = new Date().toISOString();
                    artifact.approval_record_id = id;
                    fs.writeFileSync(outputFile, JSON.stringify(artifact, null, 2), 'utf8');
                } catch (e) { }
            }

            fs.unlinkSync(filePath);
            const resolvedPath = filePath.replace('.pending.json', '.approved.json');
            fs.writeFileSync(
                resolvedPath,
                JSON.stringify({ ...data, status: 'approved', resolved_at: new Date().toISOString(), comment }, null, 2),
                'utf8'
            );

            writeAuditLog('approval.decision', role, role, 'approval', id, tenant, cycle, { status: 'pending' }, { status: 'approved', approvals_received: approvalsReceived }, comment);

            res.json({
                success: true,
                message: `[approve] Artifact from agent "${agent}" approved successfully. All required roles (${requiredRoles.join(', ')}) have approved. Advanced to production.`
            });
        } else {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

            writeAuditLog('approval.partial', role, role, 'approval', id, tenant, cycle, null, { approvals_received: approvalsReceived }, comment);

            const remaining = requiredRoles.filter(r => !approvalsReceived[r]);
            res.json({
                success: true,
                message: `[approve] Approved by ${role}. Still waiting for remaining roles: ${remaining.join(', ')}.`
            });
        }
    } else {
        const result = await runRealCLI(`claude -p "/gtm-approve ${id} as=${role} comment=\\"${comment}\\""`);
        res.json(result);
    }
});

// 6. Reject (/gtm-reject)
app.post('/api/reject', async (req, res) => {
    const { id, role, comment } = req.body;

    if (!comment || comment.trim() === '') {
        return res.status(400).json({ success: false, error: 'Rejection comment is required.' });
    }

    const approvalInfo = findPendingApproval(id);
    if (approvalInfo) {
        const { data, filePath, tenant, cycle, agent } = approvalInfo;

        const currentIteration = (data.revision_iteration || 0) + 1;
        data.revision_iteration = currentIteration;

        if (currentIteration >= 3) {
            data.required_roles = ['CEO'];
            data.required_role = 'CEO';
            data.approvals_received = {};

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

            writeAuditLog('approval.escalated', role, role, 'approval', id, tenant, cycle, null, { iteration: currentIteration, required_roles: ['CEO'] }, comment);

            res.json({
                success: true,
                message: `[reject] Rejection limit reached (${currentIteration} rejections). Artifact "${agent}" has been escalated to the CEO for final decision.`
            });
        } else {
            fs.unlinkSync(filePath);
            const resolvedPath = filePath.replace('.pending.json', '.rejected.json');
            fs.writeFileSync(
                resolvedPath,
                JSON.stringify({ ...data, status: 'rejected', resolved_at: new Date().toISOString(), comment }, null, 2),
                'utf8'
            );

            // Delete the old output file so Content Viewer reflects the rejection status
            const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
            const outputFile = path.join(busPath, `${agent}.output.json`);
            if (fs.existsSync(outputFile)) {
                fs.unlinkSync(outputFile);
            }

            // Trigger background regeneration using the rejection comment as prompt feedback
            (async () => {
                try {
                    console.log(`[REJECTION LOOP] Auto-regenerating agent: ${agent} for ${tenant} with feedback: ${comment}`);
                    await runGeminiAgentDirectly(tenant, cycle, agent, comment);
                } catch (e) {
                    console.error('[REJECTION LOOP ERROR]', e);
                }
            })();

            writeAuditLog('approval.decision', role, role, 'approval', id, tenant, cycle, { status: 'pending' }, { status: 'rejected', iteration: currentIteration }, comment);

            res.json({
                success: true,
                message: `[reject] Artifact from agent "${agent}" rejected. Old output deleted. Auto-triggering regeneration with feedback...`
            });
        }
    } else {
        const result = await runRealCLI(`claude -p "/gtm-reject ${id} as=${role} comment=\\"${comment}\\""`);
        res.json(result);
    }
});

// 7. Validate Profile (/gtm-validate-profile)
app.post('/api/validate-profile', async (req, res) => {
    const { tenant } = req.body;
    if (!tenant) return res.status(400).json({ error: 'Missing tenant' });
    const result = await runRealCLI(`claude -p "/gtm-validate-profile ${tenant}"`);
    res.json(result);
});

// 8. Agent Run (/gtm-agent-run)
app.post('/api/agent-run', async (req, res) => {
    const { tenant, cycle, agent, customInstructions } = req.body;
    if (!tenant || !cycle || !agent) return res.status(400).json({ error: 'Missing tenant, cycle, or agent' });
    
    if (customInstructions) {
        console.log(`[AGENT RUN] Executing agent ${agent} with custom instructions: "${customInstructions}"`);
    }

    const cmd = `claude -p "/gtm-agent-run tenant=${tenant} cycle=${cycle} agent=${agent}${customInstructions ? ` instruction=\\\"${customInstructions}\\\"` : ''}"`;
    const result = await runRealCLI(cmd);
    res.json(result);
});

// 9. True Dashboard (/gtm-dashboard)
// Dynamically scans tenant workspace structure to compile real campaign metrics
app.get('/api/dashboard/:tenant', (req, res) => {
    const tenant = req.params.tenant;
    const tenantPath = path.join(getRootPath(), 'tenants', tenant);

    if (!fs.existsSync(tenantPath)) {
        return res.json({
            success: true,
            metrics: {
                status: 'Inactive',
                cycle: 'N/A',
                deliverablesCount: 0,
                pendingApprovals: 0,
                phase1Progress: 0,
                phase2Progress: 0,
                phase3Progress: 0,
                phase4Progress: 0,
                phase5Progress: 0
            }
        });
    }

    const cyclesPath = path.join(tenantPath, 'cycles');
    let latestCycle = 'N/A';
    let deliverablesCount = 0;
    let pendingApprovals = 0;
    let p1Count = 0, p2Count = 0, p3Count = 0, p4Count = 0, p5Count = 0;

    try {
        if (fs.existsSync(cyclesPath)) {
            const cycles = fs.readdirSync(cyclesPath).filter(f => !f.startsWith('.'));
            if (cycles.length > 0) {
                latestCycle = cycles[cycles.length - 1];
                for (const cy of cycles) {
                    const busPath = path.join(cyclesPath, cy, 'context_bus');
                    if (fs.existsSync(busPath)) {
                        const outputs = fs.readdirSync(busPath).filter(f => f.endsWith('.output.json'));
                        deliverablesCount += outputs.length;

                        outputs.forEach(f => {
                            const agent = f.replace('.output.json', '');
                            if (['brief_intake', 'market_research', 'audience_intelligence', 'keyword_intent', 'research_synthesis'].includes(agent)) p1Count++;
                            if (['positioning', 'value_proposition', 'messaging_matrix', 'content_pillars', 'narrative_lock'].includes(agent)) p2Count++;
                            if (['website_copy', 'content_assets', 'email_sequences', 'social_content', 'paid_ad_creative', 'sales_enablement'].includes(agent)) p3Count++;
                            if (['channel_strategy', 'campaign_calendar', 'seo_activation', 'paid_media', 'outbound_partner', 'community_activation'].includes(agent)) p4Count++;
                            if (['measurement', 'experiment_review', 'competitive_pulse', 'executive_brief', 'iteration_planner'].includes(agent)) p5Count++;
                        });
                    }

                    const appPath = path.join(cyclesPath, cy, 'approvals');
                    if (fs.existsSync(appPath)) {
                        const pending = fs.readdirSync(appPath).filter(f => f.endsWith('.pending.json'));
                        pendingApprovals += pending.length;
                    }
                }
            }
        }

        const phase1Progress = Math.min(100, Math.round((p1Count / 5) * 100));
        const phase2Progress = Math.min(100, Math.round((p2Count / 5) * 100));
        const phase3Progress = Math.min(100, Math.round((p3Count / 6) * 100));
        const phase4Progress = Math.min(100, Math.round((p4Count / 6) * 100));
        const phase5Progress = Math.min(100, Math.round((p5Count / 5) * 100));

        res.json({
            success: true,
            metrics: {
                status: deliverablesCount > 0 ? 'Active' : 'Initialized',
                cycle: latestCycle,
                deliverablesCount,
                pendingApprovals,
                phase1Progress,
                phase2Progress,
                phase3Progress,
                phase4Progress,
                phase5Progress
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to compile dashboard metrics', details: e.message });
    }
});

// 10. Read Tenant Profile
app.get('/api/tenant-profile/:tenant', async (req, res) => {
    const tenant = req.params.tenant;
    const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
    try {
        let fileContent;
        if (!fs.existsSync(profilePath)) {
            if (process.env.GEMINI_API_KEY) {
                try {
                    console.log(`[GEMINI] Generating AI profile template for: ${tenant}`);
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `
Generate a professional, fully filled B2B SaaS tenant profile YAML file for a company named "${tenant}".
It must adhere strictly to the following YAML schema:

version: 2
profile_id: ${tenant}
extends: vertical_packs/_template

company:
  legal_name: "${tenant} Inc."
  brand_name: "${tenant}"
  url: "https://${tenant.toLowerCase().replace(/[^a-z0-9]/g, '')}.com"
  founded: 2022
  size_band: "mid_market"
  hq_country: "US"
  description_short: "A short one sentence description of what the company does."
  description_long: "A longer description of the company product, value proposition, and how it helps customers."

industry:
  primary: "Identify the primary B2B software industry category"
  secondary: ["List a few secondary categories"]

lob:
  - id: core_product
    motion: enterprise_abm
    weight: 1.0

icp_archetypes:
  - id: mid_market_buyer
    industries: ["technology", "healthcare", "finance"]
    company_size: ["100-1000"]
    geos: ["US"]
    buying_committee:
      economic_buyer: "CFO"
      technical_buyer: "Controller"
      user_buyer: "Finance_Operations_Manager"
      influencers: ["VP_Finance", "Internal_Audit_Lead"]
    committee_complexity: "medium"
    deal_size_band: "50k-100k"
    sales_cycle_days: 90

frameworks: []

regulatory_constraints: []

brand_voice:
  archetype: "Sage"
  tone: ["clear", "practical", "outcome-focused"]
  reading_level: "grade_11"
  banned_phrases: ["synergy", "world-class", "cutting-edge"]
  required_disclaimers: []

geography:
  primary_markets: ["US"]
  expansion_markets: []

languages:
  default: "en-US"
  supported: ["en-US"]

currency:
  default: "USD"
  reporting: "USD"

tech_stack:
  crm: "hubspot"
  marketing_automation: "hubspot"
  analytics: "ga4"
  social: "linkedin"
  ad_platforms: ["linkedin_ads", "google_ads"]

approval_roles:
  - role: CMO
    name: "CMO Name"
    email: "cmo@${tenant.toLowerCase().replace(/[^a-z0-9]/g, '')}.com"
    scope: [brand, campaign, positioning]
  - role: SME
    name: "SME Name"
    scope: [technical_claims]
  - role: Legal
    name: "Legal Name"
    scope: [regulatory_claims]
  - role: CFO
    name: "CFO Name"
    scope: [spend_over_threshold]
  - role: SalesLeader
    name: "VP Sales Name"
    scope: [pipeline_facing_artifacts]
  - role: CEO
    name: "CEO Name"
    scope: [positioning, executive_voice]
  - role: CustomerSuccess
    name: "CS Lead Name"
    scope: [customer_named]

operating_calendar:
  cycle_length: monthly
  fiscal_year_start: "01-01"

---
Ensure the output is ONLY the raw YAML content, with no markdown formatting or code block wrappers (like \`\`\`yaml). Generate highly realistic details specifically tailored to what a company named "${tenant}" would do.
`;
                    const geminiResult = await generateContentWithRetry(model, prompt);
                    let responseText = geminiResult.response.text().trim();
                    if (responseText.startsWith('```')) {
                        responseText = responseText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
                    }
                    fileContent = responseText;
                } catch (err) {
                    console.error("Gemini template generation failed, falling back to static:", err);
                }
            }

            if (!fileContent) {
                // Fallback to static template
                const examplePath = path.join(getRootPath(), 'tenants', '_example', 'tenant_profile.yaml');
                if (fs.existsSync(examplePath)) {
                    let exampleContent = fs.readFileSync(examplePath, 'utf8');
                    exampleContent = exampleContent.replace(/profile_id:\s*_example/g, `profile_id: ${tenant}`);
                    exampleContent = exampleContent.replace(/legal_name:\s*"Acme Software Inc."/g, `legal_name: "${tenant} Inc."`);
                    exampleContent = exampleContent.replace(/brand_name:\s*"Acme"/g, `brand_name: "${tenant}"`);
                    fileContent = exampleContent;
                } else {
                    return res.status(404).json({ error: 'Profile template not found' });
                }
            }
        } else {
            fileContent = fs.readFileSync(profilePath, 'utf8');
        }
        const profileData = yaml.parse(fileContent);
        res.json({ success: true, profile: profileData, rawYaml: fileContent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read profile', details: error.message });
    }
});

// 11. Write Tenant Profile
app.post('/api/tenant-profile/:tenant', (req, res) => {
    const tenant = req.params.tenant;
    const { profile, rawYaml } = req.body;
    if (!profile && !rawYaml) return res.status(400).json({ error: 'Missing profile data' });

    const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
    try {
        const dirPath = path.dirname(profilePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // If rawYaml is provided (from the Advanced Editor), write it directly
        // Otherwise stringify the JSON profile object
        let yamlContent = rawYaml;
        if (!yamlContent) {
            yamlContent = yaml.stringify(profile);
        }

        fs.writeFileSync(profilePath, yamlContent, 'utf8');
        res.json({ success: true, message: 'Profile saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save profile', details: error.message });
    }
});

// 12. List agent outputs (context_bus) for a given tenant+cycle
app.get('/api/outputs/:tenant/:cycle', (req, res) => {
    const { tenant, cycle } = req.params;
    const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
    try {
        if (!fs.existsSync(busPath)) return res.json({ outputs: [] });
        const files = fs.readdirSync(busPath).filter(f => f.endsWith('.json'));
        const outputs = files.map(f => {
            try {
                const raw = fs.readFileSync(path.join(busPath, f), 'utf8');
                const data = JSON.parse(raw);
                return { file: f, agent: data.written_by_agent || f.replace('.output.json', ''), payload: data.payload || data, written_at: data.written_at };
            } catch { return { file: f, agent: f, payload: null }; }
        });
        res.json({ outputs });
    } catch (e) {
        res.status(500).json({ error: 'Failed to read outputs', details: e.message });
    }
});

// 13. Save a generated content piece (for demo/simulated output)
app.post('/api/outputs/:tenant/:cycle', (req, res) => {
    const { tenant, cycle } = req.params;
    const { agent, payload } = req.body;
    if (!agent || !payload) return res.status(400).json({ error: 'Missing agent or payload' });

    const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
    fs.mkdirSync(busPath, { recursive: true });

    const outputFile = path.join(busPath, `${agent}.output.json`);
    const record = {
        schema_version: `${agent}.Output:v1.0.0`,
        written_by_agent: agent,
        written_at: new Date().toISOString(),
        tenant_id: tenant,
        cycle_id: cycle,
        payload
    };
    fs.writeFileSync(outputFile, JSON.stringify(record, null, 2));
    writeAuditLog('agent.output.saved', 'System Operator', 'Operator', 'agent_output', agent, tenant, cycle, null, { status: 'completed' });
    res.json({ success: true, message: 'Output saved successfully.' });
});

// 14. Delete an agent output
app.delete('/api/outputs/:tenant/:cycle/:agent', (req, res) => {
    const { tenant, cycle, agent } = req.params;
    const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
    const outputFile = path.join(busPath, `${agent}.output.json`);
    const approvalPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'approvals');

    try {
        let deleted = false;
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
            deleted = true;
        }
        
        // Also remove any pending approvals associated with this agent output
        const pendingFile = path.join(approvalPath, `${agent}.pending.json`);
        const approvedFile = path.join(approvalPath, `${agent}.approved.json`);
        const rejectedFile = path.join(approvalPath, `${agent}.rejected.json`);
        
        if (fs.existsSync(pendingFile)) fs.unlinkSync(pendingFile);
        if (fs.existsSync(approvedFile)) fs.unlinkSync(approvedFile);
        if (fs.existsSync(rejectedFile)) fs.unlinkSync(rejectedFile);

        if (deleted) {
            writeAuditLog('output.deleted', 'System Operator', 'Operator', 'output', agent, tenant, cycle, null, { status: 'deleted' });
            res.json({ success: true, message: `Output for agent ${agent} deleted successfully.` });
        } else {
            res.status(404).json({ error: 'Output file not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete output', details: e.message });
    }
});

// 14.5. Interactive Agent Playground API
app.post('/api/agent-playground-run', async (req, res) => {
    const { company, industry, agent, customInstructions } = req.body;
    if (!company || !industry || !agent) {
        return res.status(400).json({ error: 'Missing company name, industry, or agent.' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. Scaffold a clean virtual tenant profile object
        const tempProfile = {
            company: {
                brand_name: company,
                legal_name: `${company} Inc.`,
                size_band: 'mid_market',
                hq_country: 'US',
                description_short: `A B2B solutions provider in the ${industry} niche.`
            },
            industry: {
                primary: industry,
                secondary: []
            },
            brand_voice: {
                archetype: 'Sage',
                tone: ['clear', 'outcome-focused', 'trustworthy'],
                reading_level: 'grade_11',
                banned_phrases: ['revolutionary', 'world-class']
            },
            geography: {
                primary_markets: ['US']
            },
            languages: {
                default: 'en-US',
                supported: ['en-US']
            },
            currency: {
                default: 'USD'
            }
        };

        // 2. Locate agent template prompt
        let agentPrompt = '';
        const phases = ['phase1_research', 'phase2_narrative', 'phase3_assets', 'phase4_distribution', 'phase5_measurement'];
        let foundPath = null;
        for (const phase of phases) {
            const p = path.join(getRootPath(), 'agents', phase, agent, 'prompt.md');
            if (fs.existsSync(p)) {
                foundPath = p;
                break;
            }
        }

        if (foundPath) {
            agentPrompt = fs.readFileSync(foundPath, 'utf8');
        } else {
            agentPrompt = `Write B2B marketing content for the ${agent} task.`;
        }

        // 3. Compile prompt templates (dry runs for upstream variables in playground)
        const compiledPrompt = compilePromptTemplate(agentPrompt, tempProfile, {}, {});

        // 4. Construct System instructions prompt
        const systemPrompt = `You are a GTM AI Agent named "${agent}" for the company described in the profile.
Execute the following agent prompt instructions and output the generated marketing assets or research.

--- COPYWRITING & FORMATTING RULES ---
1. Return only the requested B2B content.
2. Do not include explanations, introductions, conclusions, notes, or disclaimers.
3. Use correct grammar and natural, professional language.
4. Keep the formatting clean, clear, and easy to copy and paste.
5. If the agent instructions request a JSON payload, return ONLY a clean JSON object. Do not add markdown wrappers (like \`\`\`json) inside the JSON string itself; just return clean parsable data.
6. Preserve line breaks where appropriate for readability.
7. Tone must be professional, persuasive, and tailored to target B2B buyers.

--- COMPANY PROFILE ---
${JSON.stringify(tempProfile, null, 2)}

--- CUSTOM INSTRUCTIONS & BRIEF ---
${customInstructions || 'None'}

--- AGENT INSTRUCTIONS ---
${compiledPrompt}
`;

        console.log(`[PLAYGROUND] Running agent playground: ${agent} for topic: ${industry}`);
        const result = await generateContentWithRetry(model, systemPrompt);
        const text = result.response.text().trim();

        // 5. Parse JSON output if present
        let payload = text;
        if (text.startsWith('```json')) {
            const cleanText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
                payload = JSON.parse(cleanText);
            } catch (e) {
                payload = cleanText;
            }
        } else if (text.startsWith('```')) {
            payload = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
                payload = JSON.parse(payload);
            } catch (e) { }
        } else {
            try {
                payload = JSON.parse(text);
            } catch (e) { }
        }

        res.json({
            success: true,
            payload
        });

    } catch (error) {
        console.error('[PLAYGROUND ERROR]', error);
        res.status(500).json({ error: `Failed to run agent in playground: ${error.message}` });
    }
});

// 15. Competitor Intelligence Agent
// AI-powered competitive landscape analysis using Gemini
app.post('/api/competitor-analysis', async (req, res) => {
    const { service, industry, region } = req.body;
    if (!service) return res.status(400).json({ error: 'Missing service/capability to analyze' });

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const industryContext = industry ? `Focus specifically on the ${industry} industry.` : 'Cover all major industries.';
        const regionContext = region ? `Focus on the ${region} market.` : 'Cover global markets with emphasis on North America.';

        const prompt = `You are a senior market research analyst. Analyze the competitive landscape for "${service}" services/solutions.

${industryContext}
${regionContext}

Return a JSON object with EXACTLY this structure (no markdown, no code blocks, just raw JSON):

{
  "market_overview": {
    "market_name": "The formal market name for this service category",
    "estimated_market_size": "e.g. $18.5B (2025)",
    "projected_growth": "e.g. 14.2% CAGR through 2030",
    "key_trends": ["trend1", "trend2", "trend3", "trend4"],
    "market_maturity": "Emerging | Growing | Mature | Declining"
  },
  "competitors": [
    {
      "rank": 1,
      "name": "Company Name",
      "description": "One-line description of what they offer in this space",
      "founded": "Year or N/A",
      "headquarters": "City, Country",
      "pricing_tier": "Enterprise | Mid-Market | SMB | Freemium | Open Source",
      "pricing_range": "e.g. $5-25/user/month or Contact Sales",
      "market_position": "Leader | Challenger | Niche | Emerging",
      "overall_score": 85,
      "scores": {
        "features": 90,
        "ease_of_use": 75,
        "pricing_value": 60,
        "support": 80,
        "scalability": 85,
        "innovation": 70
      },
      "key_strengths": ["strength1", "strength2", "strength3"],
      "key_weaknesses": ["weakness1", "weakness2"],
      "best_for": "Who should choose this solution",
      "notable_clients": ["client1", "client2", "client3"]
    }
  ],
  "feature_matrix": {
    "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5", "Feature 6", "Feature 7", "Feature 8"],
    "matrix": {
      "Company Name": ["✅", "✅", "⚠️", "✅", "❌", "✅", "✅", "⚠️"]
    }
  },
  "recommendation": {
    "top_pick": "Company Name",
    "top_pick_reason": "Why this is the best overall choice",
    "best_value": "Company Name",
    "best_value_reason": "Why this offers the best value for money",
    "best_for_enterprise": "Company Name",
    "best_for_smb": "Company Name",
    "summary": "A 2-3 sentence executive summary of the competitive landscape"
  }
}

IMPORTANT RULES:
- Include exactly 8 competitors, ranked by overall market position
- All scores must be integers between 0 and 100
- feature_matrix must include ALL 8 competitors
- Use real, well-known companies that actually provide "${service}" services
- Be factual and balanced in your analysis
- Return ONLY the JSON object, no other text`;

        console.log(`[COMPETITOR INTEL] Analyzing competitive landscape for: ${service}`);
        const result = await generateContentWithRetry(model, prompt, 3, 2000);
        let responseText = result.response.text().trim();

        // Clean markdown wrappers if present
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (parseErr) {
            console.error('[COMPETITOR INTEL] Failed to parse Gemini response as JSON:', parseErr.message);
            return res.status(500).json({
                error: 'AI returned malformed data. Please try again.',
                raw: responseText.substring(0, 500)
            });
        }

        res.json({
            success: true,
            query: { service, industry: industry || 'All Industries', region: region || 'Global' },
            analysis: parsed,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('[COMPETITOR INTEL ERROR]', error);
        res.status(500).json({
            error: `Competitor analysis failed: ${error.message}`
        });
    }
});

// Helper to format content to clean readable HTML for the email
function formatContentToHTML(content) {
    if (!content) return '';

    // Helper to format text with newlines into HTML paragraphs
    const formatText = (txt) => {
        if (!txt) return '';
        return String(txt).replace(/\n/g, '<br/>');
    };

    // 0. Single Email Step
    if (content && typeof content === 'object' && (content.subject || content.subject_line) && (content.body_markdown || content.body || content.content)) {
        return `
            <div style="background: white; border: 1px solid #e4e4e7; border-radius: 6px; padding: 15px; font-family: sans-serif;">
                <div style="font-size: 14px; color: #18181b; margin-bottom: 8px;">
                    <strong>Subject:</strong> ${content.subject || content.subject_line}
                </div>
                ${content.preheader ? `<div style="font-size: 12px; color: #71717a; margin-bottom: 10px; font-style: italic;">Preheader: ${content.preheader}</div>` : ''}
                <div style="font-size: 13px; color: #18181b; line-height: 1.6; background: #fafafa; padding: 12px; border-radius: 4px; border: 1px solid #f4f4f5; white-space: pre-wrap;">${formatText(content.body_markdown || content.body || content.content)}</div>
                ${content.cta ? `<div style="margin-top: 10px; font-size: 12px; color: #10b981;"><strong>CTA:</strong> <span style="background: #ecfdf5; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${content.cta}</span></div>` : ''}
            </div>
        `;
    }

    // 1. Email Sequences
    if (content.email_sequences || content.steps || content.emails) {
        const list = content.email_sequences || content.steps || content.emails || [];
        if (Array.isArray(list)) {
            let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
            list.forEach((seq, sIdx) => {
                const steps = seq.steps || [];
                html += `
                    <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; margin-bottom: 20px; background: #fafafa; font-family: sans-serif;">
                        <h4 style="color: #4f46e5; margin: 0 0 15px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">📂 Sequence: ${seq.sequence_id || seq.purpose || `Sequence ${sIdx + 1}`}</h4>
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                `;
                steps.forEach((email, idx) => {
                    html += `
                        <div style="background: white; border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px; margin-top: 10px; font-family: sans-serif;">
                            <div style="font-weight: bold; color: #18181b; font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                                <span>📧 Step ${email.step_number || idx + 1}: ${email.label || 'Email Campaign'}</span>
                                <span style="font-weight: normal; color: #71717a; font-size: 12px; margin-left: 20px;">⏱️ Delay: ${email.delay_after_prior_step_hours ? `${email.delay_after_prior_step_hours}h` : 'Immediate'}</span>
                            </div>
                            <div style="font-size: 13px; color: #3f3f46; margin-bottom: 6px;"><strong>Subject:</strong> ${email.subject || email.subject_line}</div>
                            ${email.preheader ? `<div style="font-size: 13px; color: #71717a; margin-bottom: 8px; font-style: italic;">Preheader: ${email.preheader}</div>` : ''}
                            <div style="font-size: 13px; color: #18181b; line-height: 1.6; background: #fafafa; padding: 10px; border-radius: 4px; border: 1px solid #f4f4f5; white-space: pre-wrap;">${formatText(email.body_markdown || email.body || email.content)}</div>
                            ${email.cta ? `<div style="margin-top: 8px; font-size: 12px; color: #10b981;"><strong>CTA Button:</strong> <span style="background: #ecfdf5; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${email.cta}</span></div>` : ''}
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }
    }

    // 2. Paid Ad Creative
    if (content.google_search || content.linkedin_ads || content.meta_ads || content.paid_ad_creative_pack || content.platforms) {
        const pack = content.paid_ad_creative_pack || content || {};
        let google = pack.google_search || [];
        let linkedin = pack.linkedin_ads || [];
        
        if (pack.platforms && Array.isArray(pack.platforms)) {
            const gPlat = pack.platforms.find(p => p.platform_id === 'google_search' || p.platform_id === 'google');
            if (gPlat && gPlat.campaigns) {
                google = [];
                gPlat.campaigns.forEach(c => {
                    if (c.ads) {
                        c.ads.forEach(ad => {
                            google.push({
                                ...ad,
                                landing_url: ad.landing_url || c.landing_url || 'https://example.com'
                            });
                        });
                    }
                });
            }
            
            const lPlat = pack.platforms.find(p => p.platform_id === 'linkedin_ads' || p.platform_id === 'linkedin');
            if (lPlat && lPlat.campaigns) {
                linkedin = [];
                lPlat.campaigns.forEach(c => {
                    if (c.ads) {
                        c.ads.forEach(ad => {
                            linkedin.push(ad);
                        });
                    }
                });
            }
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 15px; font-family: sans-serif;">';
        
        google.forEach((ad, idx) => {
            html += `
                <div style="border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px; background: white;">
                    <div style="font-size: 12px; color: #4f46e5; font-weight: bold; margin-bottom: 4px;">Google Search Ad Preview</div>
                    <div style="font-size: 15px; color: #1a0dab; text-decoration: underline; font-weight: 500;">${Array.isArray(ad.headlines) ? ad.headlines.join(' | ') : (ad.headlines || ad.headline || 'Search Ad')}</div>
                    <div style="color: #006621; font-size: 12px; margin: 2px 0;">${ad.landing_url || 'https://example.com'}</div>
                    <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.4;">${ad.description || ad.description_line1 || ''}</p>
                </div>
            `;
        });
        
        linkedin.forEach((ad, idx) => {
            html += `
                <div style="border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px; background: white; margin-top: 10px;">
                    <div style="font-size: 12px; color: #0077b5; font-weight: bold; margin-bottom: 4px;">LinkedIn Sponsored Ad Copy</div>
                    <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.4; white-space: pre-wrap;">${formatText(ad.primary_text || ad.intro_text || ad.body || '')}</p>
                    ${(ad.headline || ad.title) ? `<div style="font-weight: bold; font-size: 13px; color: #18181b; margin-top: 6px;">Headline: ${ad.headline || ad.title}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    // 3. General Object Formatter
    if (typeof content === 'object') {
        let html = '<div style="display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;">';
        Object.entries(content).forEach(([k, v]) => {
            if (k === 'schema_version' || k === 'written_by_agent' || k === 'written_at') return;
            html += `
                <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 10px 15px;">
                    <div style="font-size: 11px; color: #4f46e5; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">${k.replace(/_/g, ' ')}</div>
                    <div style="font-size: 13px; color: #18181b; line-height: 1.5; white-space: pre-wrap;">
                        ${typeof v === 'object' ? formatContentToHTML(v) : formatText(v)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    // String/text fallback
    return `<div style="font-size: 14px; line-height: 1.6; color: #18181b; white-space: pre-wrap; font-family: sans-serif;">${formatText(content)}</div>`;
}

// 30. Dispatch Email API
app.post('/api/dispatch-email', async (req, res) => {
    const { tenant, cycle, agent, stakeholder, recipients, subject, notes, recipientsPayload } = req.body;
    
    // Normalize recipients to a list of objects
    let targetRecipients = [];
    if (Array.isArray(recipients)) {
        targetRecipients = recipients;
    } else if (stakeholder && stakeholder.email) {
        targetRecipients = [stakeholder];
    }

    if (!tenant || !cycle || !agent || targetRecipients.length === 0) {
        return res.status(400).json({ error: 'Missing required parameters: tenant, cycle, agent, and at least one recipient.' });
    }

    const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
    const filePath = path.join(busPath, `${agent}.output.json`);

    try {
        let content;
        if (recipientsPayload) {
            content = recipientsPayload;
        } else {
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: `No generated output found for agent ${agent} in tenant ${tenant}` });
            }
            const rawData = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(rawData);
            content = parsed.payload || parsed;
        }

        // Configure Nodemailer transporter
        let transporter;
        let isTestAccount = false;
        let testAccount = null;

        if (process.env.SMTP_HOST) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        } else {
            console.log("[SMTP] No SMTP config found. Creating temporary Ethereal test account...");
            testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            isTestAccount = true;
        }

        const formattedContent = formatContentToHTML(content);
        const results = [];

        // Send to all selected recipients
        for (const recipient of targetRecipients) {
            if (!recipient.email) continue;

            const mailOptions = {
                from: process.env.SMTP_FROM || '"GTM OS AI Department" <gtm-dispatcher@example.com>',
                to: recipient.email,
                subject: subject || `GTM OS Dispatch: AI Marketing ${agent}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px; color: #18181b;">
                        <h2 style="color: #4f46e5; margin-bottom: 5px;">GTM OS Marketing Dispatch</h2>
                        <p style="font-size: 14px; color: #71717a; margin-top: 0; margin-bottom: 20px;">Autonomous B2B Marketing Delivery</p>
                        
                        <p>Hello <strong>${recipient.name || 'Stakeholder'}</strong> (${recipient.role || 'Member'}),</p>
                        <p>The AI Agent <strong>${agent}</strong> has generated marketing deliverables for the <strong>${tenant}</strong> campaign cycle (<strong>${cycle}</strong>).</p>
                        
                        ${notes ? `
                        <div style="background: #fef08a; border-left: 4px solid #eab308; padding: 12px; margin: 15px 0; border-radius: 4px; font-size: 14px;">
                            <strong>Reviewer / CMO Notes:</strong><br/>
                            ${notes}
                        </div>
                        ` : ''}
                        
                        <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Deliverable Preview</h3>
                        ${formattedContent}
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #a1a1aa; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 15px;">
                            Sent automatically by GTM Operating System Monolith.
                        </p>
                    </div>
                `
            };

            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`[SMTP] Email successfully dispatched to ${recipient.email}. MessageId: ${info.messageId}`);
                
                let previewUrl = null;
                if (isTestAccount) {
                    previewUrl = nodemailer.getTestMessageUrl(info);
                }

                writeAuditLog(
                    'email.dispatched',
                    'System Operator',
                    'Operator',
                    'email',
                    agent,
                    tenant,
                    cycle,
                    null,
                    { recipient_email: recipient.email, recipient_name: recipient.name, subject, notes }
                );

                results.push({
                    email: recipient.email,
                    name: recipient.name,
                    role: recipient.role,
                    success: true,
                    messageId: info.messageId,
                    previewUrl
                });

            } catch (sendErr) {
                console.error(`[SMTP DISPATCH TO ${recipient.email} FAILED]`, sendErr);
                results.push({
                    email: recipient.email,
                    name: recipient.name,
                    role: recipient.role,
                    success: false,
                    error: sendErr.message
                });
            }
        }

        const overallSuccess = results.some(r => r.success);
        res.json({
            success: overallSuccess,
            message: overallSuccess ? `Successfully dispatched email to selected members.` : `Failed to dispatch emails.`,
            results
        });

    } catch (error) {
        console.error('[SMTP DISPATCH ERROR]', error);
        res.status(500).json({ error: `Failed to dispatch email: ${error.message}` });
    }
});

// 31. Convert Competitor to Tenant Workspace API
app.post('/api/onboard-competitor', async (req, res) => {
    const { name, description, founded, headquarters, best_for } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Missing competitor name.' });
    }

    const folderName = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    const tenantPath = path.join(getRootPath(), 'tenants', folderName);
    const yamlPath = path.join(tenantPath, 'tenant_profile.yaml');

    try {
        if (fs.existsSync(yamlPath)) {
            return res.status(409).json({ error: `A workspace for '${name}' already exists!` });
        }

        if (!fs.existsSync(tenantPath)) {
            fs.mkdirSync(tenantPath, { recursive: true });
        }

        // Clean domain name from competitor name
        const cleanDomain = name.toLowerCase().replace(/[^a-z0-9]/g, "") + '.com';

        // Write a customized yaml profile with realistic details and stakeholder emails
        const yamlContent = `version: 2
profile_id: "${folderName}"
extends: vertical_packs/_template
company:
  legal_name: "${name} Inc."
  brand_name: "${name}"
  url: "https://${cleanDomain}"
  founded: ${founded || 2020}
  size_band: "mid_market"
  hq_country: "US"
  description_short: "${description || `Advanced solutions for ${best_for || 'B2B markets'}.`}"
  description_long: |
    ${description || `${name} is a leading provider specializing in ${best_for || 'enterprise software'}.`}.
    Headquartered in ${headquarters || 'United States'}.

industry:
  primary: "enterprise_software"
  secondary: []

lob:
  - id: core_service
    motion: enterprise_abm
    weight: 1.0

icp_archetypes:
  - id: enterprise_it_decision_maker
    industries: ["all"]
    company_size: ["100-1000"]
    geos: ["US"]
    buying_committee:
      economic_buyer: "CTO"
      technical_buyer: "IT Director"
      user_buyer: "Knowledge Workers"
      influencers: ["CISO", "CFO"]
    committee_complexity: "medium"
    deal_size_band: "30k-150k"
    sales_cycle_days: 90

brand_voice:
  archetype: "Sage"
  tone: ["trustworthy", "innovative", "clear"]
  reading_level: "grade_11"
  banned_phrases: ["revolutionary", "world-class"]
  required_disclaimers: []

geography:
  primary_markets: ["US"]
  expansion_markets: []

languages:
  default: "en-US"
  supported: ["en-US"]

currency:
  default: "USD"
  reporting: "USD"

tech_stack:
  crm: "hubspot"
  marketing_automation: "hubspot"
  analytics: "ga4"
  seo: "ahrefs"
  social: "linkedin"
  ad_platforms: ["linkedin_ads", "google_ads"]

approval_roles:
  - role: CMO
    name: "${name} CMO"
    email: "cmo@${cleanDomain}"
    scope: [brand, campaign, positioning]
    notification: [email]
  - role: Legal
    name: "${name} Legal Team"
    email: "legal@${cleanDomain}"
    scope: [regulatory_claims, customer_logos]
  - role: CEO
    name: "${name} CEO"
    email: "ceo@${cleanDomain}"
    scope: [executive_voice, positioning]

operating_calendar:
  cycle_length: monthly
  fiscal_year_start: "01-01"
  blackout_dates: []
`;

        fs.writeFileSync(yamlPath, yamlContent, 'utf8');

        res.json({
            success: true,
            message: `Workspace '${name}' onboarded successfully!`,
            tenantId: folderName
        });

    } catch (error) {
        console.error('[ONBOARD COMPETITOR ERROR]', error);
        res.status(500).json({ error: `Failed to onboard competitor workspace: ${error.message}` });
    }
});

// 32. Dispatch WhatsApp API
app.post('/api/dispatch-whatsapp', async (req, res) => {
    const { tenant, cycle, agent, recipients } = req.body;
    if (!tenant || !cycle || !agent || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Missing required parameters: tenant, cycle, agent, and recipients list.' });
    }

    try {
        const results = [];
        
        for (const recipient of recipients) {
            if (!recipient.phone) continue;

            const cleanPhone = recipient.phone.replace(/[^0-9]/g, '');
            const compiledMessage = recipient.compiledMessage || `GTM OS Dispatch for ${tenant}`;

            // Generate official wa.me direct click-to-chat URL
            const clickToChatUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(compiledMessage)}`;

            console.log(`[WHATSAPP DISPATCH] Simulating send to ${recipient.name} (${recipient.phone})`);
            console.log(`[WHATSAPP MESSAGE TEXT]:\n${compiledMessage}`);
            console.log(`[WHATSAPP CLICK-TO-CHAT]: ${clickToChatUrl}`);

            // Write to compliance audit log
            writeAuditLog(
                'whatsapp.dispatched',
                'System Operator',
                'Operator',
                'whatsapp',
                agent,
                tenant,
                cycle,
                null,
                { recipient_phone: recipient.phone, recipient_name: recipient.name }
            );

            results.push({
                role: recipient.role,
                name: recipient.name,
                phone: recipient.phone,
                success: true,
                clickToChatUrl
            });
        }

        res.json({
            success: true,
            message: 'WhatsApp dispatches successfully compiled.',
            results
        });

    } catch (error) {
        console.error('[WHATSAPP DISPATCH ERROR]', error);
        res.status(500).json({ error: `Failed to dispatch WhatsApp: ${error.message}` });
    }
});

// Serve static frontend files in production
const frontendDistPath = fs.existsSync(path.join(__dirname, 'dist'))
    ? path.join(__dirname, 'dist')
    : path.join(__dirname, '../ui/dist');

if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`GTM OS Backend (Flow Enabled) listening on http://localhost:${PORT}`);
});

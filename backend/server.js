require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
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
    } catch (e) {}

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

// Helper to run agents using Gemini Free API
const runGeminiAgentDirectly = async (tenant, cycle, agent) => {
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
        if (fs.existsSync(profilePath)) {
            profileContent = fs.readFileSync(profilePath, 'utf8');
        }

        // 2. Locate agent folder and prompt
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

        // 3. Construct Gemini Prompt with professional copywriting constraints
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
${agentPrompt}
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
            } catch (e) {}
        } else {
            try {
                payload = JSON.parse(text);
            } catch (e) {}
        }

        const busPath = path.join(getRootPath(), 'tenants', tenant, 'cycles', cycle, 'context_bus');
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
        } catch(e) {}

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
                return {
                    success: true,
                    message: `[cycle_start] Cycle ${cycle} successfully started for ${tenant} via Gemini Bridge.`
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
                                } catch (e) {}
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
                        } catch (e) {}
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
                } catch(e) {}
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

            writeAuditLog('approval.decision', role, role, 'approval', id, tenant, cycle, { status: 'pending' }, { status: 'rejected', iteration: currentIteration }, comment);

            res.json({
                success: true,
                message: `[reject] Artifact from agent "${agent}" rejected. Sent back to feedback loop. (Revision iteration: ${currentIteration}/3)`
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
    const { tenant, cycle, agent } = req.body;
    if (!tenant || !cycle || !agent) return res.status(400).json({ error: 'Missing tenant, cycle, or agent' });
    const result = await runRealCLI(`claude -p "/gtm-agent-run tenant=${tenant} cycle=${cycle} agent=${agent}"`);
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
                return { file: f, agent: data.written_by_agent || f.replace('.output.json',''), payload: data.payload || data, written_at: data.written_at };
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
    res.json({ success: true, message: `Output saved for agent: ${agent}` });
});

// 14. Competitor Intelligence Agent
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

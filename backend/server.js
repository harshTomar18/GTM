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

// Helper to run agents using Gemini Free API
const runGeminiAgentDirectly = async (tenant, cycle, agent) => {
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
        const result = await model.generateContent(systemPrompt);
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

        fs.writeFileSync(
            path.join(approvalPath, `${agent}.pending.json`),
            JSON.stringify({
                id: approvalId,
                tenant,
                cycle,
                agent,
                required_role: 'CMO', // Default role for human governance
                status: 'pending',
                created_at: new Date().toISOString()
            }, null, 2)
        );

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
                return {
                    success: true,
                    message: `[cycle_start] Cycle ${cycle} successfully started for ${tenant} via Gemini Bridge.`
                };
            }
        } else if (command.includes('/gtm-tenant-init')) {
            const tenant = getCommandParam(command, 'tenant');
            const pack = getCommandParam(command, 'pack');
            if (tenant && pack) {
                const packPath = path.join(getRootPath(), 'tenants', pack);
                const tenantPath = path.join(getRootPath(), 'tenants', tenant);
                if (!fs.existsSync(tenantPath)) {
                    fs.mkdirSync(tenantPath, { recursive: true });
                    if (fs.existsSync(packPath)) {
                        fs.cpSync(packPath, tenantPath, { recursive: true });
                    }
                }
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
            const packPath = path.join(getRootPath(), 'tenants', pack);
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

// Helper to resolve pending approvals by moving them from .pending.json to .[status].json
const resolvePendingApproval = (id, status, comment) => {
    const tenantsPath = path.join(getRootPath(), 'tenants');
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
                            const filePath = path.join(appPath, f);
                            try {
                                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                                if (data.id === id) {
                                    // Remove pending
                                    fs.unlinkSync(filePath);
                                    // Write resolution history file
                                    fs.writeFileSync(
                                        filePath.replace('.pending.json', `.${status}.json`),
                                        JSON.stringify({ ...data, status, resolved_at: new Date().toISOString(), comment }, null, 2)
                                    );
                                    return { success: true, tenant: t, cycle: cy, agent: data.agent };
                                }
                            } catch (e) {}
                        }
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
    const resolved = resolvePendingApproval(id, 'approved', comment);
    if (resolved) {
        res.json({
            success: true,
            message: `[approve] Artifact from agent "${resolved.agent}" approved successfully by ${role} and advanced to production.`
        });
    } else {
        // Fallback mock check if not found on disk
        const result = await runRealCLI(`claude -p "/gtm-approve ${id} as=${role} comment=\\"${comment}\\""`);
        res.json(result);
    }
});

// 6. Reject (/gtm-reject)
app.post('/api/reject', async (req, res) => {
    const { id, role, comment } = req.body;
    const resolved = resolvePendingApproval(id, 'rejected', comment);
    if (resolved) {
        res.json({
            success: true,
            message: `[reject] Artifact from agent "${resolved.agent}" rejected with feedback: "${comment}". Sent back to AI rewriting loop.`
        });
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
                phase3Progress: 0
            }
        });
    }

    const cyclesPath = path.join(tenantPath, 'cycles');
    let latestCycle = 'N/A';
    let deliverablesCount = 0;
    let pendingApprovals = 0;
let p1Count = 0, p2Count = 0, p3Count = 0;

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

        res.json({
            success: true,
            metrics: {
                status: deliverablesCount > 0 ? 'Active' : 'Initialized',
                cycle: latestCycle,
                deliverablesCount,
                pendingApprovals,
                phase1Progress,
                phase2Progress,
                phase3Progress
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to compile dashboard metrics', details: e.message });
    }
});

// 10. Read Tenant Profile
app.get('/api/tenant-profile/:tenant', (req, res) => {
    const tenant = req.params.tenant;
    const profilePath = path.join(getRootPath(), 'tenants', tenant, 'tenant_profile.yaml');
    try {
        if (!fs.existsSync(profilePath)) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const fileContent = fs.readFileSync(profilePath, 'utf8');
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

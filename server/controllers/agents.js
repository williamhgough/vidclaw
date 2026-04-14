import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { OPENCLAW_JSON } from '../config.js';

const execFileAsync = promisify(execFile);

function readAgentList() {
  try {
    const cfg = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf8'));
    return Array.isArray(cfg?.agents?.list) ? cfg.agents.list.map((agent) => ({
      id: agent.id,
      identityName: agent.identity?.name || agent.identityName || agent.id,
      identityEmoji: agent.identity?.emoji || agent.identityEmoji || '',
      identitySource: agent.identitySource || 'identity',
      workspace: agent.workspace,
      agentDir: agent.agentDir,
      model: agent.model?.primary || agent.model,
      bindings: agent.bindings,
      isDefault: !!agent.default,
      routes: agent.routes || [],
      providers: agent.providers || [],
    })) : [];
  } catch {
    return [];
  }
}

async function runOpenClaw(args) {
  const { stdout } = await execFileAsync('openclaw', args, {
    timeout: 120000,
    maxBuffer: 5 * 1024 * 1024,
    env: process.env,
  });
  const text = String(stdout || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function listAgents(req, res) {
  res.json(readAgentList());
}

export async function spawnAgent(req, res) {
  const agent = String(req.body?.agent || '').trim();
  const message = String(req.body?.message || '').trim();
  const thinking = String(req.body?.thinking || 'low').trim();
  if (!agent) return res.status(400).json({ error: 'agent is required' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const data = await runOpenClaw(['agent', '--agent', agent, '--message', message, '--thinking', thinking, '--json']);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}

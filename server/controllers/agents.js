import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
  try {
    const data = await runOpenClaw(['agents', 'list', '--json']);
    res.json(Array.isArray(data) ? data : data.items || []);
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
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

# OpenClaw Control UI: Your Agent's Built-In Command Center

*A practical tour of the browser dashboard that ships with OpenClaw — no extra install required.*

---

If you're running [OpenClaw](https://github.com/openclaw/openclaw), you already have a dashboard. Most people don't know it exists.

The Gateway that powers OpenClaw also serves a browser-based Control UI — kanban-style task management, model switching, cron job editing, config patching, skill toggling, and live log tailing. All from `http://localhost:18789/`.

This is what I use instead of herding everything through chat.

## What You Already Have

OpenClaw's Gateway runs on port `18789` by default. When you start it, the Control UI is already there — no plugin, no separate download.

```bash
openclaw gateway
```

Then open your browser to **`http://127.0.0.1:18789/`**. That's it.

If you're on a different machine on the same Tailscale network, the UI is also reachable over HTTPS via Tailscale Serve — no SSH tunnel needed.

## Accessing It Remotely Over Tailscale

The config I run keeps the Gateway on loopback and uses Tailscale Serve to proxy it:

```json
{
  "gateway": {
    "bind": "loopback",
    "tailscale": { "mode": "serve" }
  }
}
```

Start the gateway:
```bash
openclaw gateway
```

Open **`https://<your-machine>.ts.net/`** from any browser on your Tailnet. The Control UI is there with a valid HTTPS cert — no tunnel, no port forwarding.

## First-Time Pairing

If you connect from a new browser or device, you'll see `"disconnected (1008): pairing required"`. This is normal — it's a security check.

Approve it from the gateway host:

```bash
openclaw devices list
# Find the pending request ID
openclaw devices approve <requestId>
```

Local loopback connections are auto-approved. Tailnet and LAN connections need explicit approval once per browser profile.

## What the Control UI Actually Does

### Chat

The same chat interface you'd get in a terminal, but in a browser. Chat history, streaming responses, tool call cards, and the ability to inject messages. Model and thinking-mode pickers in the header are persistent session overrides — useful for quick experiments.

### Task Board

The `/tasks` command in any chat session opens the background task board. But you can also see this directly in the UI — it shows all queued, running, and completed tasks across ACP runs, subagent spawns, isolated cron jobs, and CLI operations.

Each task shows runtime, status, timing, and error detail. From here you can cancel a running task or change its notification policy.

### Cron Jobs Panel

Full CRUD for cron jobs: list, add, edit, run, enable, and disable. Shows run history. You can configure:
- Schedule (cron expression or interval)
- Session target (main, isolated, or named session)
- Payload type (systemEvent for main-session or agentTurn for isolated)
- Delivery mode (announce to channel, webhook, or none)
- Advanced options: delete-after-run, exact/stagger cron timing, model/thinking overrides

Changes take effect immediately — no config file editing required.

### Skills Manager

Browse all installed skills. Toggle them on or off. Install new ones from ClawHub directly. Update API keys for skill credentials. The agent picks up skill changes on its next session automatically.

### Config Editor

View and patch `~/.openclaw/openclaw.json` directly from the UI. The form mode renders schema metadata (titles, descriptions, nested structure) and validates before write. If you prefer raw JSON, there's an editor for that too — with a safe round-trip guard that prevents you from accidentally corrupting SecretRef objects.

There's also a "apply + restart" button that validates the config and restarts the gateway in one step.

### Sessions Panel

List all active sessions. Per-session overrides for model, thinking, reasoning, and fast/verbose modes. Lets you steer subagents or isolated sessions without touching their config files.

### Channels Panel

See all configured channels (Discord, Telegram, Signal, etc.) with their enabled status and login state. For channels that support QR login, there's a QR code directly in the UI.

### Logs Tab

Live tail of gateway file logs with filter and export. Useful when something breaks and you need to see what the gateway was doing without grep-ing a log file.

### System Health

Status snapshot: gateway health, configured models, active sessions, task counts. Same data as `openclaw status` but in a webpage.

## What It Does NOT Do

The Control UI is a management surface — it's not meant to replace your normal chat interface for daily work. It's where you go to:
- Configure the system (not prompt the agent)
- Debug issues (not run production tasks)
- Manage credentials and skills (not have conversations)

For daily interaction, Discord, Telegram, or whichever channel you prefer is still the right place.

## Keeping It Secure

The Control UI is an admin surface. OpenClaw enforces auth at the WebSocket handshake — you need a token, password, or Tailscale identity headers to connect. By default it binds to loopback only, so nobody on the network can reach it unless you explicitly configure remote access.

If you're exposing it via Tailscale Serve, the recommended setup is:
- `bind: "loopback"` (Gateway stays local)
- `tailscale: { mode: "serve" }` (Tailscale proxies HTTPS)
- `gateway.auth.allowTailscale: true` (Serve identity headers satisfy auth)

This way only devices on your Tailnet can reach the UI, and they authenticate via Tailscale rather than a shared secret.

## Why I Use It

Before I found the Control UI, I was SSH-ing into the server to edit markdown files, grep-ing logs, and managing cron jobs by hand. It worked, but it meant switching contexts constantly.

Now: when something breaks, I open the dashboard first. When I need to tweak a cron schedule, I use the form editor. When I want to check what the agent actually did this week, I look at the task history.

It's not a flagship feature — it's infrastructure. But it's the difference between managing OpenClaw through scattered terminal sessions and having an actual ops center.

---

*OpenClaw is open-source and MIT-licensed. The Control UI ships in the box.*

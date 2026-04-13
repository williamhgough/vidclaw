# Managing AI Agents with Background Tasks: Why Your Agent Needs an Activity Ledger

*The difference between hoping your AI agent did the right thing and knowing it did.*

---

Running an autonomous AI agent through chat works until it doesn't. You ask for something, it starts working, you forget what you asked for, the session restarts, and you have no idea whether the work ever finished.

This is the problem OpenClaw's background task system solves. It's not a kanban board in the visual sense — it's better. An activity ledger that tracks every detached operation your agent performs, across every runtime (ACP, subagent, cron, CLI), in one place.

## Why Chat-Only Task Management Breaks Down

The chat-only model looks like this:
1. You tell the agent to do something
2. It starts (probably)
3. You think of three more things
4. Some get done, some don't
5. The session restarts and pending work disappears

This is fine for one-off conversations. It's unmanageable for anything that needs durable follow-up — recurring reports, background research, automation workflows, multi-step builds.

The fix isn't a kanban board. The fix is a **system that tracks work independent of session context** and lets you query state whenever you want.

## OpenClaw's Task System

OpenClaw creates a task record for every operation that runs outside your main chat session:

| Source | What it is |
|--------|-----------|
| ACP runs | Child sessions spawned for complex tasks |
| Subagent orchestration | Isolated sessions for parallel work |
| Cron jobs | Scheduled work, both main-session and isolated |
| CLI operations | Background commands run via the agent |

Normal chat turns don't create tasks. But every cron execution, every subagent spawn, every detached ACP run — these all get tracked.

## The Task Lifecycle

Every task moves through a simple state machine:

```
queued → running → succeeded / failed / timed_out / cancelled / lost
```

`queued` means work is waiting. `running` means the agent is actively doing something. Terminal states (`succeeded`, `failed`, `timed_out`, `cancelled`) are what you care about — did the thing finish, and did it work?

`lost` is a runtime-aware state: it means the backing session or job disappeared before OpenClaw could confirm the outcome. This usually means something crashed hard.

## What Tasks Track

Each task record contains:
- **Runtime type** (ACP, subagent, cron, CLI)
- **Status** (current state)
- **Child session** (where the work actually ran)
- **Timing** (queued at, started at, ended at)
- **Delivery state** (was notification attempted, did it succeed)
- **Error detail** (if it failed)
- **Terminal summary** (human-readable outcome)

You can look up any task by ID, run ID, or session key.

## The /tasks Board

In any chat session, type `/tasks` to see the task board for that session. It shows:
- Active tasks (queued + running)
- Recently completed tasks with status
- Error details for failures
- Timing information

If your session has no linked tasks, it falls back to agent-local task counts — so you always get an overview without leaking other-session details.

For the full operator ledger across all sessions, the CLI command is:

```bash
openclaw tasks list
```

Filter by runtime or status:
```bash
openclaw tasks list --runtime cron --status failed
openclaw tasks list --runtime subagent --status running
```

## Task Notifications

By default, you only hear about terminal states (`succeeded`, `failed`, etc.). This is the `done_only` policy — you get pinged when something finishes, not while it's running.

Change the policy while it's running:
```bash
openclaw tasks notify <lookup> state_changes
```

Or silence it entirely:
```bash
openclaw tasks notify <lookup> silent
```

For cron jobs specifically, the default is `silent` — they track without generating notifications. Isolate cron runs default to `done_only` instead.

## Cron Jobs: Scheduling That Survives Restarts

OpenClaw's cron system is where scheduled work lives. Definitions are stored in `~/.openclaw/cron/jobs.json`, and every execution — main-session or isolated — gets a task record.

Main-session cron tasks run inside your current conversation session on a schedule. Isolated cron tasks run in their own session, detached from any chat context.

Why it matters: if your agent is mid-conversation when a cron job fires, a main-session cron has to compete with whatever you're doing. An isolated cron runs independently — it won't interrupt your chat, and chat output won't interrupt it.

Configuring a cron job through the Control UI (Sessions → Cron Jobs → New):
- **Schedule**: cron expression or interval in milliseconds
- **Session target**: `main`, `isolated`, or a named session
- **Payload**: `systemEvent` (injects text into main session) or `agentTurn` (runs an isolated agent turn)
- **Delivery**: announce to a channel, webhook POST, or none

## The Heartbeat Distinction

Heartbeat is different from cron. Heartbeat runs are **main-session turns** — they don't create task records. When a heartbeat fires, it runs inside your existing conversation context, not in a separate session.

Tasks track detached work. Heartbeat is the mechanism for ongoing, session-bound maintenance — the agent doing light housekeeping, checking for work, updating logs, without creating a separate activity record.

The two work together: a cron job can trigger a heartbeat, which in turn checks a task board and picks up work. The cron creates the task; the heartbeat processes it.

## What This Looks like in Practice

Here's my actual workflow:

**Morning (2 min):**
```bash
openclaw tasks list --status failed
```
If anything failed overnight, I see it immediately. I check the error, fix the input, and re-run or cancel.

**Throughout the day:**
- `openclaw tasks list --runtime subagent --status running` — what's my agent working on right now?
- `openclaw tasks show <id>` — get the full record for a specific task
- `/tasks` in chat — quick glance without leaving my conversation

**Evening:**
```bash
openclaw tasks audit
```
This surfaces operational issues: stale queued tasks, tasks running too long, delivery failures. I address anything that looks like a pattern.

## Failure Handling

The audit command is the first place I look when something goes wrong:

| Finding | Severity | What it means |
|---------|----------|---------------|
| `stale_queued` | warn | Queued more than 10 minutes, agent hasn't started |
| `stale_running` | error | Running more than 30 minutes, might be hung |
| `lost` | error | Backing state disappeared, outcome unknown |
| `delivery_failed` | warn | Tried to notify but couldn't reach you |
| `missing_cleanup` | warn | Terminal task never got cleaned up |

Task records are kept for 7 days, then automatically pruned. No manual cleanup needed.

## Why This Is Better Than a Kanban Board

Kanban boards are visual, which is great for humans. But they require you to open them, read them, and interpret them. OpenClaw's task system is queryable — you can ask it questions:

- "What failed this week?"
- "What's been running since yesterday?"
- "Show me every task from the last 24 hours"
- "Which cron jobs have never succeeded?"

You can't ask a kanban board that. And because tasks are created automatically by the runtime, you can't forget to add them — they capture the actual activity, not a subjective todo list.

The goal isn't visual organization. The goal is **accountability**: knowing what your agent did, when it did it, and whether it worked.

---

*OpenClaw's task system ships in the box. `openclaw tasks --help` for the full CLI reference.*

# OpenStatus Skills for Agents

Status page & incident communication skills for AI agents — by [OpenStatus](https://openstatus.dev).

Write better incident updates, postmortems, maintenance announcements, and status reports. Works with Claude Code, Codex, Cursor, Windsurf, and any agent supporting the Agent Skills spec.

## Skills

| Skill | Description | Type |
|-------|-------------|------|
| [`status-page-context`](skills/status-page-context/) | Set up your product, components, SLAs, and communication tone — referenced by all other skills | Foundational |
| [`incident-communication`](skills/incident-communication/) | Write clear, actionable incident updates for any phase (investigating → resolved) | Vendor-agnostic |
| [`postmortem`](skills/postmortem/) | Write blameless postmortems with timeline, root cause analysis, and action items | Vendor-agnostic |
| [`maintenance`](skills/maintenance/) | Write planned maintenance announcements (scheduled, in-progress, completed, extended, cancelled) | Vendor-agnostic |
| [`status-report`](skills/status-report/) | Write periodic health reports (weekly, monthly, quarterly) with uptime metrics and trends | Vendor-agnostic |
| [`global-speed-checker`](skills/global-speed-checker/) | Run global performance checks from multiple regions using OpenStatus | OpenStatus-specific |
| [`status-page-ui`](skills/status-page-ui/) | Build a custom status page UI with OpenStatus components, React widget, or SDK | OpenStatus-specific |

## Installation

### Option 1: npx skills

```bash
# Install all skills
npx skills add openstatushq/skills

# Install a specific skill
npx skills add openstatushq/skills --skill incident-communication

# List available skills
npx skills add openstatushq/skills --list
```

### Option 2: Git clone

```bash
git clone https://github.com/openstatushq/skills.git .agents/skills/openstatus
```

Then add to your `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": ["Read", "Write", "Glob"]
  }
}
```

## Getting Started

1. Install the skills using one of the methods above
2. Run the `status-page-context` skill first to set up your product context
3. Use any other skill — they'll automatically read your context for consistent tone and component names

---

Built by [OpenStatus](https://openstatus.dev). Need help? Join our [Discord](https://openstatus.dev/discord) or message us at [ping@openstatus.dev](mailto:ping@openstatus.dev).

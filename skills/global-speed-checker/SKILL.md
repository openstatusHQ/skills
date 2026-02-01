---
name: global-speed-checker
version: 0.2.0
description: Run global performance checks on HTTP endpoints from multiple regions worldwide. Use when users want to check speed, latency, performance, or test endpoints globally.
---

# Global Speed Checker

Check HTTP endpoint performance from 28 regions worldwide.

## When to Use

- "check the speed of https://api.example.com"
- "test https://example.com globally"
- "how fast is my API from different regions"

## Workflow

### 1. Parse Request

Extract from user's message:
- **URL** (required)
- **Method** (optional, default: GET)
- **Headers** (optional)
- **Body** (optional)

### 2. Make API Call

```bash
curl -s -L -X POST "https://openstatus.dev/play/checker/api" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","method":"GET"}'
```

Returns newline-delimited JSON. Each line is a region result. Final line is the check ID.

### 3. Display Results

Create markdown table sorted by latency (fastest first):
- **Columns**: Region | Latency | Status | DNS | Connection | TLS | TTFB | Transfer
- **Region**: Map code to name (e.g., `fra` → "Frankfurt (Fly) 🇩🇪")
- **Timing phases**: Calculate from `timing` object (e.g., DNS = `dnsDone - dnsStart`)

### 4. Add Summary

```markdown
**Fastest**: [region] ([latency]) • **Slowest**: [region] ([latency]) • **Average**: [avg]ms • **Success rate**: [x/y] ([%])

[View and share results](https://openstatus.dev/play/checker/[check-id])
```

Then ask: `Would you like to see detailed insights or structured JSON data?`

### 5. Optional: Insights (if requested)

Analyze results (3-5 observations):
- Status codes, regional gaps, TLS/TTFB/DNS performance
- See [references/insights-generation-guide.md](references/insights-generation-guide.md)

### 6. Optional: JSON Export (if requested)

Provide complete results as structured JSON.

## Region Mapping

Common codes:
- `fra` → Frankfurt (Fly) 🇩🇪
- `iad` → Virginia (Fly) 🇺🇸
- `sin` → Singapore (Fly) 🇸🇬
- `lhr` → London (Fly) 🇬🇧
- `koyeb_fra` → Frankfurt (Koyeb) 🇩🇪
- `railway_us-west2` → California (Railway) 🇺🇸

Full list: [references/regions-detailed.md](references/regions-detailed.md)

## Error Handling

**Rate Limit (429)**: Show limit, remaining, reset time

**Invalid Request (400)**: Show error message and details from response

**No Client IP (400)**: Explain VPN/proxy may cause this

## Reference Files

- [regions-detailed.md](references/regions-detailed.md) - Complete region mapping
- [timing-phases.md](references/timing-phases.md) - Timing explanations and optimization
- [insights-generation-guide.md](references/insights-generation-guide.md) - Insight patterns
- [performance-benchmarks.md](references/performance-benchmarks.md) - Expected performance ranges
- [common-issues.md](references/common-issues.md) - Troubleshooting guide

## Notes

- Tests from 28 regions (Fly.io, Koyeb, Railway)
- Takes ~2-5 seconds
- Rate limit: 10 requests per 60 seconds
- Results cached for 7 days

---
name: global-speed-checker
version: 0.1.0
description: Run global performance checks on HTTP endpoints from multiple regions worldwide. Use when users want to check speed, latency, performance, or test endpoints globally. Triggers on "check speed", "global test", "performance check", "latency test", "test from all regions", "global speed checker", or similar queries about endpoint performance from multiple geographic locations.
---

# Global Speed Checker

Check HTTP endpoint performance from 28 regions worldwide using the `/play/checker/api` streaming endpoint.

## When to Use

Trigger this skill when users ask about endpoint performance testing from multiple regions:
- "check the speed of https://api.example.com"
- "test https://example.com/api performance globally"
- "run a speed check on https://api.com with POST method"
- "check latency for https://api.example.com with auth headers"
- "how fast is my API from different regions"
- "test https://example.com globally"

## Workflow

**CRITICAL OUTPUT FORMAT REQUIREMENT**: All results MUST be displayed as a markdown table (never as a list). The table format is mandatory and non-negotiable.

**Default output**: Display only the markdown table with a brief summary line. Ask if the user wants detailed insights or structured JSON data. Only generate additional sections if explicitly requested.

**REMEMBER**: All results MUST be presented in markdown table format. Never use lists.

### 1. Parse Request

Extract from the user's natural language:
- **URL** (required): Any valid HTTP/HTTPS URL
- **Method** (optional): GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS (default: GET)
- **Headers** (optional): Parse patterns like "with header Authorization: Bearer token" or "with headers Content-Type: application/json and X-API-Key: secret"
- **Body** (optional): Parse patterns like "with body {...}" or "with JSON body {...}"

**Parsing examples:**
- "check https://api.com" → `{url: "https://api.com", method: "GET"}`
- "test POST to https://api.com" → `{url: "https://api.com", method: "POST"}`
- "test POST to https://api.com with header Auth: Bearer 123" → `{url: "https://api.com", method: "POST", headers: [{key: "Auth", value: "Bearer 123"}]}`
- "check https://api.com with body {\"test\": true}" → `{url: "https://api.com", method: "GET", body: "{\"test\": true}"}`

### 2. Call the API

Make a POST request to the streaming endpoint:

```
POST https://openstatus.dev/play/checker/api
Content-Type: application/json

{
  "url": "https://example.com",
  "method": "GET",
  "headers": [{"key": "Authorization", "value": "Bearer token"}],
  "body": "{\"query\": \"test\"}"
}
```

The API returns a streaming response where each line is a JSON object.

### 3. Make the API Call and Wait for Results

Show initial status message, then call the API:

```markdown
Running global speed check on https://example.com...
```

Use curl to call the streaming endpoint (typical response time: 2-5 seconds):

```bash
curl -s -L -X POST "https://openstatus.dev/play/checker/api" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","method":"GET"}'
```

**Important**: Use `-s` flag to suppress curl progress output. The API streams results but the Bash tool waits for completion before returning, so true real-time updates aren't possible. Results will appear all at once after 2-5 seconds.

### 4. Parse Stream Response

The API returns newline-delimited JSON. Each line contains a region result:

**Current format** (without type tags - old API):
```json
{"region":"fra","type":"http","state":"success","status":200,"latency":124,...}
```

**Enhanced format** (with type tags - when new API is deployed):
```json
{"type":"metadata","rateLimit":{"limit":10,"remaining":7,"reset":1706745930000}}
{"type":"region","data":{...region check...},"index":0}
{"type":"complete","id":"abc123def456..."}
```

**Extract the check ID**: The final line contains either:
- A 32-character hex string (current format), OR
- A `{"type":"complete","id":"..."}` object (enhanced format)

**Save this ID** - you'll need it to generate the shareable link in step 6.

### 5. Display Results as Markdown Table

Once all results arrive, parse the stream and display as a clean markdown table **sorted by latency (fastest first)**:

```markdown
| Region | Latency | Status | DNS | Connection | TLS | TTFB | Transfer |
|--------|---------|--------|-----|------------|-----|------|----------|
| Frankfurt 🇩🇪 | 124ms | 200 | 8ms | 24ms | 31ms | 45ms | 16ms |
| Singapore 🇸🇬 | 256ms | 200 | 12ms | 45ms | 52ms | 98ms | 49ms |
| Sydney 🇦🇺 | 342ms | 200 | 15ms | 67ms | 78ms | 112ms | 70ms |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

**Critical formatting requirements:**
- **MUST use markdown table format** - Lists or other formats are NOT acceptable
- **MUST sort by latency** (fastest regions at top)
- **MUST include all timing phase columns** (DNS, Connection, TLS, TTFB, Transfer)
- **Display region name**: Use "location (provider) flag" from the Available Regions mapping
  - `fra` → "Frankfurt (Fly) 🇩🇪"
  - `koyeb_sin` → "Singapore (Koyeb) 🇸🇬"
  - `railway_us-west2` → "California (Railway) 🇺🇸"
- **Format latency**: `124ms` (integer + "ms")
- **Calculate timing phases**: Extract from timing object
  - DNS: `timing.dnsDone - timing.dnsStart`
  - Connection: `timing.connectDone - timing.connectStart`
  - TLS: `timing.tlsHandshakeDone - timing.tlsHandshakeStart`
  - TTFB: `timing.firstByteDone - timing.firstByteStart`
  - Transfer: `timing.transferDone - timing.transferStart`

### 6. Add Brief Summary

After the table, add a single-line summary with the key metrics and shareable link:

```markdown
**Fastest**: Frankfurt 🇩🇪 (124ms) • **Slowest**: Sydney 🇦🇺 (342ms) • **Average**: 203ms • **Success rate**: 100% (28/28)

[View and share results](https://openstatus.dev/play/checker/abc123def456...)
```

**Extract the check ID** from the final line of the stream response (32-character hex string) and include it in the shareable link:
- Format: `https://openstatus.dev/play/checker/[id]`
- Example: `https://openstatus.dev/play/checker/a1b2c3d4e5f6...` (full 32-char ID)

### 7. Ask for Additional Details

After displaying the table and summary, ask the user if they want more information:

```markdown
Would you like to see detailed insights or structured JSON data?
```

Only generate the following sections if the user explicitly asks for them.

### 8. Generate Performance Insights (Optional)

**Only generate if requested.** Analyze the results and generate 3-5 actionable observations.

**For comprehensive insight patterns, thresholds, and examples**, see [references/insights-generation-guide.md](references/insights-generation-guide.md).

**Quick insight patterns:**
- Status: All 2xx → "✓ All regions returned success", Some fail → "⚠ X regions returned errors"
- Regional gaps: One continent >1.5x slower → "⚠ APAC regions are 2.3x slower than Europe average"
- TLS: Avg <40ms → "✓ TLS optimized", Avg >60ms → "⚠ TLS could be improved"
- TTFB/DNS: TTFB >100ms → "⚠ High TTFB", DNS >50ms → "⚠ DNS resolution slow"

### 9. Export Structured Data (Optional)

**Only generate if requested.** Provide the complete results as JSON for programmatic use:

```json
{
  "url": "https://api.example.com",
  "method": "GET",
  "timestamp": 1706745600000,
  "summary": {
    "fastest": {"region": "Frankfurt", "code": "fra", "latency": 124},
    "slowest": {"region": "Sydney", "code": "syd", "latency": 342},
    "average": 203,
    "p95": 298,
    "successRate": 100,
    "totalRegions": 28
  },
  "regions": [
    {
      "region": "Frankfurt",
      "code": "fra",
      "flag": "🇩🇪",
      "latency": 124,
      "status": 200,
      "timing": {
        "dns": 8,
        "connection": 24,
        "tls": 31,
        "ttfb": 45,
        "transfer": 16
      }
    }
    // ... more regions
  ]
}
```

## Error Handling

### Rate Limit (429)

When the API returns 429 status, parse the error response and display:

```markdown
⚠️ **Rate Limit Exceeded**

You've reached the limit of 10 requests per minute.
Please wait 45 seconds before trying again.

Rate limit info:
- Limit: 10 requests / 60 seconds
- Remaining: 0
- Resets at: 2026-02-01 12:45:30 UTC
```

Parse reset time from error response: `reset` timestamp field.
Calculate wait time: `Math.ceil((reset - Date.now()) / 1000)` seconds.

### Invalid Request (400)

Display the error message clearly with details:

```markdown
❌ **Invalid Request**

URL is required and must be valid.

Details:
- Field: url
- Issue: Invalid URL format
```

Parse error details from response `details.issues` array.

### No Client IP (400)

```markdown
❌ **Unable to Process Request**

Cannot determine client IP address. This may occur when:
- Using a VPN that doesn't forward IP headers
- Running behind a proxy without proper configuration
- Network configuration blocking IP detection
```

### Failed Region Checks

**IMPORTANT**: Failed regions MUST stay in the main table. Do NOT create separate lists or sections for failures.

Show failed regions in the table with error indication:

```markdown
| Region | Latency | Status | DNS | Connection | TLS | TTFB | Transfer |
|--------|---------|--------|-----|------------|-----|------|----------|
| Frankfurt 🇩🇪 | 124ms | 200 | 8ms | 24ms | 31ms | 45ms | 16ms |
| Tokyo 🇯🇵 | - | Error | - | - | - | - | - |
| Singapore 🇸🇬 | 256ms | 200 | 12ms | 45ms | 52ms | 98ms | 49ms |
```

Then mention in the summary: "⚠ 1 region failed to respond (Tokyo 🇯🇵)"

## Region Mapping Reference

The API tests from 28 regions across Fly.io, Koyeb, and Railway. Key regions to know:

**Common codes:**
- `fra` → Frankfurt 🇩🇪, `sin` → Singapore 🇸🇬, `nrt` → Tokyo 🇯🇵
- `iad` → Virginia 🇺🇸, `lhr` → London 🇬🇧, `syd` → Sydney 🇦🇺

**For complete region mapping with continents and provider details**, see [references/regions-detailed.md](references/regions-detailed.md).

## Timing Phases Reference

Each region returns timing breakdown:
- **DNS**: Domain resolution time
- **Connection**: TCP connection time
- **TLS**: SSL/TLS handshake time
- **TTFB**: Time to first byte (server processing)
- **Transfer**: Response download time

**Total latency** = DNS + Connection + TLS + TTFB + Transfer

**For detailed timing explanations, optimization strategies, and interpretation**, see [references/timing-phases.md](references/timing-phases.md).

## Reference Files

Use these reference files for detailed information when needed:

- **[regions-detailed.md](references/regions-detailed.md)** - Complete region mapping with provider details, continent coverage, latency matrix, and deployment strategies. Read when users ask about specific regions or need help interpreting geographic performance patterns.

- **[timing-phases.md](references/timing-phases.md)** - Deep dive into DNS, Connection, TLS, TTFB, and Transfer phases with optimization strategies and interpretation examples. Read when users need help understanding timing breakdowns or optimizing specific phases.

- **[insights-generation-guide.md](references/insights-generation-guide.md)** - Comprehensive patterns for generating insights with thresholds, examples, and priority ordering. Read when generating detailed insights (Step 8).

- **[performance-benchmarks.md](references/performance-benchmarks.md)** - Expected performance ranges by endpoint type (static site, REST API, GraphQL, serverless, etc.) and distance. Read when users ask "is this performance good?" or need to set expectations.

- **[common-issues.md](references/common-issues.md)** - Diagnostic playbook for troubleshooting slow DNS, connection issues, TLS problems, TTFB bottlenecks, and regional gaps. Read when performance is poor and users need help diagnosing root cause.

## Notes

- The API tests from 28 active regions across three cloud providers (Fly.io, Koyeb, Railway)
- Each check runs in parallel, so total time ≈ slowest region response time (~2-5 seconds typically)
- Results are cached for 7 days and can be retrieved by check ID (the 32-char hex string in the final chunk)
- Rate limit is per IP address: **10 requests per 60 seconds**
- Some locations have multiple providers (e.g., Frankfurt has both Fly and Koyeb regions)
- The API runs on edge runtime for fast global distribution
- Rate limit info is included in the first stream chunk (metadata) so you can warn users proactively

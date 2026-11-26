---
name: openstatus-health
version: 0.1.0
description: Add per-dependency /health, /livez, and /readyz endpoints with @openstatus/health. Use when integrating OpenStatus Health into Next.js, Astro, Vue/Nuxt, Node.js, Express, Fastify, Bun, Deno, or NestJS; when writing probes for Postgres, Prisma, Drizzle, Supabase, MySQL, MongoDB, Redis, S3, Stripe, OpenAI, or other dependencies; when health checks must report ok, degraded, or unhealthy, per-dependency latency, critical vs non-critical failures, caching, liveness/readiness, or monitoring with OpenStatus.
---

# OpenStatus Health

Mount health endpoints that name the dependency that is down.

`@openstatus/health` is a zero-dependency core: probes run against clients you pass in, a cache deduplicates concurrent polls, and the renderer answers `ok | degraded | unhealthy`. Thin adapters mount the same core on a framework. Probe packages know how to ping one dependency each.

Requires Node >= 22, Deno, Bun, or an edge runtime.

## When to Use

- "add a health endpoint" / "add `/health`"
- "health check says 200 or 500 but not what broke"
- "add `/livez` and `/readyz`"
- "probe Postgres / Prisma / Redis / S3 / Stripe from health"
- "integrate `@openstatus/health` with Next.js / Astro / Nuxt / Node / NestJS"
- "show degraded instead of taking the service out of rotation"

Do not use this skill for:

- Status page UI or status page data: use `status-page-ui`.
- Uptime monitoring or regional speed checks: use `global-speed-checker`.
- Application logging, tracing, or APM setup. This endpoint is not a replacement for OpenTelemetry.

## Modes

| Mode | Trigger | Action |
|---|---|---|
| **Bootstrap** | new project, "add health endpoint" | inventory deps, choose probes, write registry and route |
| **Audit** | existing `/health`, "update probes", "new dependency" | inspect route and registry, diff deps, add missing probes |
| **Refresh** | "sync health catalog", maintainer update | update the generated probe catalog and manifest |

Read `references/probe-lifecycle.md` for the full inventory and drift workflow.

## Freshness Gate

Run this before applying a framework reference.

1. Read the project framework versions from `package.json` or the lockfile.
2. Read `references/manifest.json`.
3. Compare the project's major version with `verifiedMajor`.
4. If the project major is newer, fetch the framework release notes and official docs, adapt the pattern, and tell the user the reference is stale.
5. If the project major is older, use a legacy note when one exists; otherwise warn.
6. If the network is unavailable, use the snapshot and report `verifiedAt`.

Maintainer check:

```bash
node <skill-dir>/scripts/check-freshness.mjs --check
```

Never claim a pattern was verified if it was not checked. Never silently apply guidance from a newer or older major.

## Framework Router

| Runtime | Mount | Reference |
|---|---|---|
| Next.js App Router 14–15 | `@openstatus/health-next` | `references/nextjs.md` |
| Next.js App Router 16+ | core Fetch handler in `route.ts` | `references/nextjs.md` |
| Astro 7 SSR (5+ endpoint API unchanged) | core Fetch handler in `src/pages/health.ts` | `references/astro.md` |
| Vue via Nuxt 4.6+ / Nitro | core Fetch handler in `server/routes/health.ts` | `references/vue-nuxt.md` |
| Node.js 22+ with `node:http` | `createHealthResponder` | `references/node.md` |
| Express / Fastify / Hono / Elysia / Bun / Deno | adapter or core handler | `references/node.md` |
| NestJS 12 (11 uses the same controller API) | custom adapter over `createHealthResponder` | `references/nestjs.md` |

Plain Vue is client-side. It cannot host an HTTP health endpoint. Use Nuxt/Nitro or a separate backend.

## Core Quick Start

Install the core, an adapter when one matches, and the probes you need:

```bash
npm install @openstatus/health @openstatus/health-hono @openstatus/health-turso
```

Mount it on any Fetch-API runtime:

```ts
import { createHealthHandler } from "@openstatus/health";
import { probes } from "./probes";

const handler = createHealthHandler({ probes });

Deno.serve(handler);
```

`GET /health` returns:

```json
{
  "status": "degraded",
  "checkedAt": "2026-11-14T12:00:00.000Z",
  "latencyMs": 41,
  "checks": [
    { "name": "database", "status": "ok", "critical": true, "latencyMs": 3 },
    { "name": "redis", "status": "failed", "critical": false, "latencyMs": 5000, "error": "timed out after 5000ms" }
  ]
}
```

Status rules:

- Every probe `ok` or `skipped` -> `ok`, HTTP 200.
- A non-critical probe failed or timed out -> `degraded`, HTTP 200.
- A critical probe failed or timed out -> `unhealthy`, HTTP 503.
- `skipped` never affects the result.

`degraded` answering 200 is intentional. A monitor that only asserts the status code will miss it. Assert on the body instead.

## Workflow

### 1. Inventory

Detect the framework, package manager, runtime (Node or edge), and existing health route.

Scan `package.json` for dependencies that have probes. Do not install a probe package for a dependency the project does not use. Do not assume every dependency should be critical.

### 2. Choose Probes and Criticality

Use `references/probes.md` for the dependency-to-package map.

Defaults:

- Database -> critical. Losing it makes the instance unable to serve.
- Cache -> non-critical. Losing it should degrade, not remove the instance.
- Object storage, search, email, payments, analytics, AI -> non-critical unless the product cannot serve without them.
- Custom business dependency -> ask; default non-critical.

Ask only when the answer changes routing behavior. Do not guess silently.

### 3. Write One Registry

Keep probes in one file. Routes import the array. Adding a dependency later is one line, not a route rewrite.

```ts
// src/health/probes.ts
import { prismaProbe } from "@openstatus/health-prisma";
import { redisProbe } from "@openstatus/health-redis";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const probes = [
  prismaProbe({ client: db }),
  redisProbe({ client: redis }),
];
```

Rules:

- Probes never read `process.env`. Pass clients, URLs, or tokens from the composition root.
- Use `skip` for optional dependencies that are not configured in every environment.
- Probe names must be unique. Duplicates throw at construction.
- Do not construct a client per request.

### 4. Mount the Route

Use the framework reference. Keep the route thin: import the registry, mount the handler, export the required methods.

### 5. Harden the Endpoint

- Set `exposeChecks: false` on a public endpoint, or use a function that checks an internal token.
- Keep the default `formatError: "generic"` unless the endpoint is internal. It avoids leaking connection strings and stack traces.
- Remember that `extend` output is hidden when checks are hidden.
- Do not put the health endpoint behind user authentication that a load balancer cannot satisfy. Use a dedicated health token or an internal-only route.
- Do not rate-limit the endpoint so hard that the orchestrator gets a 429 and restarts a healthy instance.

### 6. Split Liveness and Readiness

Liveness asks "is the process alive". Readiness asks "can it serve traffic".

```ts
// liveness: no probes, always ok
createHealthHandler({ path: "/livez", probes: [] });

// readiness: real probes, bounded round, no failure cache
createHealthHandler({
  path: "/readyz",
  probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});
```

Set `deadlineMs` below the orchestrator's own timeout. Kubernetes defaults to `timeoutSeconds: 1`.

### 7. Verify

```bash
curl -i http://localhost:3000/health
curl -I http://localhost:3000/health
curl -i -X POST http://localhost:3000/health
```

Check:

- `GET` returns the expected status and JSON.
- `HEAD` returns the same status with no body.
- Unsupported methods return 405 with `allow: GET, HEAD`.
- `cache-control: no-store` is present.
- A forced probe failure produces `degraded` or `unhealthy` as intended.
- A skipped optional dependency does not fail the endpoint.

### 8. Monitor It

Point an OpenStatus HTTP monitor at the endpoint and assert on the body:

```text
"status":"ok"
```

Alert on `degraded` before it becomes `unhealthy`. See `references/operations.md`.

## Hard Rules

- `degraded` is HTTP 200. Never alert on status code alone.
- Criticality decides 503. Do not mark everything critical.
- Probes never read environment variables.
- `cacheFailuresMs: 0` on readiness so recovery is visible on the next poll.
- `deadlineMs` must be shorter than the orchestrator timeout.
- Hide checks on public endpoints.
- Keep `formatError: "generic"` unless the caller is trusted.
- Next.js: `export const dynamic = "force-dynamic"` on the route.
- Astro: `export const prerender = false` when output is static.
- Vue: server-only, never in a client component or SPA bundle.
- Do not mount two health implementations on the same path.

## Probe Lifecycle

- New dependency -> audit mode -> add probe to the registry.
- New upstream probe package -> refresh mode -> update the catalog.
- Existing boolean `/health` -> audit mode -> preserve the URL, replace the logic.
- Unknown dependency -> write a custom probe with `probe()` or `httpProbe()`.
- A new dependency is invisible to `/health` until a probe is added. There is no runtime auto-discovery.

The coverage check is opt-in. Copy `assets/check-health-coverage.mjs` into the project only when the user asks for drift protection.

## Anti-Patterns

- `try { db.query() } catch { return 500 }` with no dependency detail.
- All probes critical, so a cache outage removes every instance from rotation.
- Probes that read `process.env` and become untestable.
- A new client inside `run()`, leaking connections on every poll.
- `exposeChecks: true` on a public endpoint, publishing the dependency list.
- `formatError: "message"` in production.
- Health route statically cached by the framework.
- Health endpoint in a Vue SPA or React client component.
- `cacheMs` so long that recovery is invisible.
- Two `/health` routes from two libraries.

## Related Skills

- `status-page-context` — product context and component names.
- `status-page-ui` — status page UI, not server health.
- `global-speed-checker` — regional performance checks.
- `incident-communication` — write updates when a probe turns unhealthy.

# Operations

Deploying and monitoring the endpoint after it works locally.

## Status Contract

| Report | HTTP | Meaning |
| --- | --- | --- |
| `ok` | 200 | Every probe resolved, or was skipped |
| `degraded` | 200 | A non-critical probe failed or timed out |
| `unhealthy` | 503 | A critical probe failed or timed out |

`degraded` answers `200` on purpose. The process can serve traffic, but
something is wrong. A monitor that asserts only on the status code sees `ok`.
Assert on the body.

Both status codes are configurable with `unhealthyStatusCode` and
`degradedStatusCode`. Keep the defaults unless an existing contract requires
otherwise.

## What to Monitor

### 1. Deep health monitor

Point an OpenStatus HTTP monitor at `/health` and assert on the body:

```text
"status":"ok"
```

This alerts on `degraded` before it becomes `unhealthy`. Without the body
assertion the check passes at 200 while a dependency is down.

Set the monitor interval below your alerting tolerance. The handler caches for
`cacheMs` (default 5000), so an interval faster than that returns the same
report.

### 2. Liveness monitor

Point the orchestrator at `/livez`. It has no probes and always returns `ok`
while the process answers. Use it to restart a wedged process, not to decide
routing.

### 3. Readiness monitor

Point the load balancer at `/readyz`. It runs the real probes with a bounded
`deadlineMs` and `cacheFailuresMs: 0`, so a recovered dependency is visible on
the next poll.

Kubernetes example:

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 3000
  periodSeconds: 10
  timeoutSeconds: 1
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  periodSeconds: 5
  timeoutSeconds: 1
  failureThreshold: 2
startupProbe:
  httpGet:
    path: /livez
    port: 3000
  periodSeconds: 2
  failureThreshold: 30
```

`deadlineMs` must be shorter than `timeoutSeconds`. If a probe can outlast the
orchestrator timeout, the orchestrator gives up first and restarts a healthy
instance.

### 4. Dashboard alert

Alert on `degraded` at a lower severity than `unhealthy`. Route it to the team
that owns the failing dependency, not to whoever is on call for the API.

## Anti-Patterns

| Anti-pattern | Result | Fix |
| --- | --- | --- |
| Monitor asserts status code only | `degraded` never alerts | Assert `"status":"ok"` in the body |
| Every probe critical | A cache blip drains every instance | Cache and SaaS probes non-critical |
| `cacheMs` longer than the poll interval | Recovery is invisible | Keep `cacheMs` ≤ monitor interval, or use `staleMs` |
| `deadlineMs` above the orchestrator timeout | Orchestrator restarts healthy pods | Set `deadlineMs` below `timeoutSeconds * 1000` |
| Health endpoint behind user auth | Load balancer gets 401 and drains the pool | Dedicated token or internal-only route |
| Aggressive rate limit on `/health` | Orchestrator gets 429 and restarts | Exempt the health path |
| Probes write to the database | Health poll mutates data | Read-only `select 1` / `ping` |
| One client per request | Connection leak | Build clients once at module load |

## Caching and Recovery

- `cacheMs` (default 5000) caches `ok` reports.
- `cacheFailuresMs` (default `cacheMs`) caches `degraded` and `unhealthy`.
- `staleMs` serves the last report while a refresh runs in the background.
- `check.invalidate()` drops the cache after a reconnect or config reload.

For readiness, set `cacheFailuresMs: 0`. Otherwise a recovered database stays
`unhealthy` for the full failure cache window and the instance stays out of
rotation.

```ts
createHealthHandler({
  path: "/readyz",
  probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});
```

## Public vs Internal

One route can serve both audiences:

```ts
createHealthHandler({
  probes,
  exposeChecks: (request) =>
    request.headers.get("x-health-token") === process.env.HEALTH_TOKEN,
  extend: () => ({ server: serverMetadata() }),
});
```

Rules:

- `exposeChecks: false` on a fully public route. The response is only
  `status` and `checkedAt`.
- Function form when the load balancer needs detail and the public does not.
- `formatError: "generic"` on public routes. It hides connection strings,
  hostnames, and stack traces.
- `extend` output is hidden when checks are hidden. Do not rely on it for
  public output.
- Do not put the endpoint behind end-user authentication. Use a dedicated
  health token or bind it to an internal port.

## Server Metadata

Hosting packages add `platform`, `region`, `instanceId`, `service`, `version`,
and `environment` under `server` through `extend`:

```ts
import { flyExtend } from "@openstatus/health-fly";

createHealthHandler({ probes, extend: flyExtend() });
```

Off-platform they return `undefined` and render nothing, so the same build runs
locally. Metadata follows `exposeChecks`: hidden checks hide it too.

## Incident Response

When a probe turns `unhealthy`:

1. Read `checks` to find the failing dependency and its `latencyMs`.
2. Confirm the dependency from its own dashboard before restarting the API.
3. If it is a non-critical dependency that should not have failed the instance,
   correct its `critical` flag in the registry.
4. If it is a critical dependency with no probe, add one after the incident.

When a probe turns `degraded`:

1. Treat it as a warning, not an outage.
2. Check whether the dependency is approaching a hard limit (connections,
   queue depth, disk).
3. Escalate if a second dependency degrades.

## Deployment Checklist

- [ ] Endpoint answers `GET` with the expected body.
- [ ] `HEAD` returns the same status with no body.
- [ ] `POST` returns `405` with `allow: GET, HEAD`.
- [ ] `cache-control: no-store` is present.
- [ ] A forced critical failure returns `503` and `unhealthy`.
- [ ] A forced non-critical failure returns `200` and `degraded`.
- [ ] A skipped optional dependency does not fail the endpoint.
- [ ] `deadlineMs` is below the orchestrator timeout.
- [ ] Public routes hide checks or require a token.
- [ ] The monitor asserts on the body, not only the status code.
- [ ] The route is not statically cached by the framework.

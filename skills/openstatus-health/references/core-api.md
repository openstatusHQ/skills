# Core API

Reference for `@openstatus/health` 0.1.x. The core has no runtime dependencies.

## Probe Contract

```ts
interface Probe {
  name: string;
  critical?: boolean;                 // default false
  timeoutMs?: number;                 // default 5000
  skip?: () => boolean | Promise<boolean>;
  run: (signal: AbortSignal, ctx: ProbeContext) => ProbeResult | Promise<ProbeResult>;
}

interface ProbeContext {
  name: string;
  critical: boolean;
  timeoutMs: number;                  // effective timeout for this run
}
```

A probe is healthy when `run` resolves. It failed when `run` rejects or throws.

`signal` aborts when `timeoutMs` elapses. Pass it to `fetch` and other cancellable calls. A probe that ignores the signal and settles late is still reported as `timeout`; the late result is discarded.

`skip` runs first, inside the same timeout window:

- `true` -> check reports `skipped`; `run` never executes.
- May be async.
- Use it for optional dependencies that are not configured in every environment.

`critical` defaults to `false`. Probe names must be unique. Duplicates throw `DuplicateProbeError` when the endpoint is created.

## Report Shape

```ts
interface HealthReport {
  status: "ok" | "degraded" | "unhealthy";
  checkedAt: string;                  // ISO timestamp
  latencyMs: number;
  checks: CheckResult[];
}

interface CheckResult {
  name: string;
  status: "ok" | "failed" | "timeout" | "skipped";
  critical: boolean;
  latencyMs: number;
  error?: string;
}
```

Status aggregation:

| Probe results | Report |
|---|---|
| every probe `ok` or `skipped` | `ok` |
| non-critical probe `failed` or `timeout` | `degraded` |
| critical probe `failed` or `timeout` | `unhealthy` |

`skipped` never affects the result.

## Entry Points

| Export | Shape | Use |
|---|---|---|
| `createHealthHandler(options)` | `(request: Request) => Promise<Response>` | Fetch-API runtimes, Astro, Nitro, Next.js 16+ |
| `createLazyHealthHandler(build)` | `(request, env) => Promise<Response>` | Workers where config exists only in `fetch(request, env)` |
| `createHealthResponder<Ctx>(options)` | `{ check, respond(ctx), toResponse(ctx, method?) }` | custom adapters, Node `http`, NestJS |
| `createHealthCheck(options)` | `{ report(), invalidate() }` | share probes between routes |
| `runProbes(probes, options)` | `Promise<HealthReport>` | one uncached round |
| `renderHealthResponse(report, options, extended?)` | `{ status, headers, body }` | render an existing report |

`createHealthHandler` answers `GET` and `HEAD`, returns `405` with `allow: GET, HEAD` for other methods, and returns `404` when `path` is set and the URL does not match. A trailing slash is tolerated. Without `path`, it answers every URL.

Every response carries:

```text
content-type: application/json; charset=utf-8
cache-control: no-store
```

`HEAD` returns the same status code with an empty body.

## Options

| Option | Default | Accepted by | Description |
|---|---|---|---|
| `probes` | — | check, handler, route | Probes to run concurrently on every uncached request |
| `check` | — | handler, route | Prebuilt `HealthCheck`; use instead of `probes` |
| `path` | Express/Hono `healthRoute`: `/health`; core handler: none | core handler, Express/Hono `healthRoute` | Route to mount; core handler answers every URL when unset. The Next.js adapter ignores it: the route file decides the URL |
| `cacheMs` | `5000` | check, handler, route | Reuse the last `ok` report; `0` disables |
| `cacheFailuresMs` | `cacheMs` | check, handler, route | Reuse `degraded` / `unhealthy` reports; set `0` for readiness |
| `staleMs` | `0` | check, handler, route | After expiry, answer the last report while one refresh runs in the background |
| `timeoutMs` | `5000` | all | Default per-probe timeout |
| `deadlineMs` | — | all | Hard cap for the whole round; caps every probe timeout |
| `exposeChecks` | `true` | responder, handler, route | `false` returns only `status` and `checkedAt`; function form decides per request |
| `unhealthyStatusCode` | `503` | responder, handler, route | HTTP status for `unhealthy` |
| `degradedStatusCode` | `200` | responder, handler, route | HTTP status for `degraded` |
| `extend` | — | responder, handler, route | Merge extra fields into the body; hidden when checks are hidden |
| `formatError` | `"generic"` | all | `"generic"`, `"message"`, or `(error) => string` |
| `onReport` | — | check, handler, route | Called once per uncached round; errors swallowed |
| `onError` | `console.error` | responder, handler, route | Called when `extend` or function `exposeChecks` throws |

Defaults are exported as `defaultTimeoutMs`, `defaultCacheMs`, `defaultUnhealthyStatusCode`, `defaultDegradedStatusCode`.

`cacheMs` only caches successful reports. `cacheFailuresMs` defaults to `cacheMs`. Concurrent callers share one round.

`staleMs` is stale-while-revalidate: the prober never waits on a probe. A refresh runs in the background.

A non-positive or non-finite `timeoutMs` or `deadlineMs` is ignored. A probe cannot be configured to fail instantly.

### exposeChecks

Boolean:

```ts
createHealthHandler({ probes, exposeChecks: false });
```

Function, for one route serving two audiences:

```ts
createHealthHandler({
  probes,
  exposeChecks: (request) =>
    request.headers.get("x-health-token") === process.env.HEALTH_TOKEN,
});
```

When checks are hidden, `extend` output is hidden too. A public response is:

```json
{ "status": "ok", "checkedAt": "2026-11-14T12:00:00.000Z" }
```

### formatError

```ts
formatError: "generic";   // "failed" / "timed out after 5000ms"
formatError: "message";   // error.message
formatError: (error) => error.name;
```

Use `"generic"` on public endpoints. It avoids leaking connection strings, hostnames, and stack details.

### extend

`extend(report, ctx)` may be async and may return anything `JSON.stringify` accepts. Report fields win over keys of the same name.

```ts
createHealthHandler({
  probes,
  extend: (_report, request) => ({
    requestId: request.headers.get("x-request-id"),
  }),
});
```

If `extend` throws, the report is served without it and the error goes to `onError`.

### check

Build once, share between routes so probes run once per cache window:

```ts
import { createHealthCheck } from "@openstatus/health";

export const check = createHealthCheck({
  probes,
  cacheMs: 5000,
  onReport: (report) => console.log(report.status, report.latencyMs),
});
```

```ts
createHealthHandler({ check, exposeChecks: false });        // public
createHealthHandler({ check, path: "/_health", extend });  // internal
```

`check.invalidate()` drops the cache. Call it after a reconnect or config reload.

## Custom Adapter

Use `createHealthResponder` and pass the framework's request context as `Ctx` so `extend` and function `exposeChecks` are typed.

```ts
import {
  createHealthResponder,
  type HealthHandlerOptions,
} from "@openstatus/health";
import type { FastifyReply, FastifyRequest } from "fastify";

export function healthHandler(options: HealthHandlerOptions<FastifyRequest>) {
  const responder = createHealthResponder<FastifyRequest>(options);

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return reply.code(405).header("allow", "GET, HEAD").send();
    }

    const { status, headers, body } = await responder.respond(req);
    reply.code(status);
    for (const [key, value] of Object.entries(headers)) {
      reply.header(key, value);
    }
    return reply.send(req.method === "HEAD" ? undefined : body);
  };
}
```

`respond(ctx)` returns `{ status, headers, body }`. It does not enforce the method or path. `toResponse(ctx, method?)` builds a `Response` and drops the body on `HEAD`.

## Helpers

- `httpProbe({ name, url, method?, headers?, expectStatus?, fetch?, critical?, timeoutMs?, skip? })` — HTTP reachability. `method` is `GET` or `HEAD`. `expectStatus` replaces the 2xx check. `fetch` swaps the implementation for tests.
- `expectOk(response, expectStatus?)` — rejects unless 2xx or the given status; cancels the body either way.
- `probe(options)` — identity helper for type inference when authoring probes.
- `probeUrl({ probe, field, value, path? })` — parse a URL at construction; throws `ProbeConfigError` naming the probe and field.
- `readEnv(name, source?)` — portable env lookup; returns `undefined` instead of throwing where access is denied.
- `omitFields(value, keys?)` — shallow copy with typed key removal. Hosting packages use it for their `omit` option.
- `resolveHealthCheck(source)` — the `check` you passed, or one built from `probes`.

## Errors

- `ProbeTimeoutError` — `signal.reason` when a timeout fires; carries `timeoutMs`.
- `DuplicateProbeError` — two probes share a name; carries `probeName`.
- `ProbeConfigError` — invalid probe option; carries `probe` and `field`.
- `genericFormatError` / `messageFormatError` — built-in formatters.

## Testing

`@openstatus/health/testing` ships doubles:

```ts
import { runProbes } from "@openstatus/health";
import {
  fakeFetch,
  hangFetch,
  okProbe,
  failingProbe,
  hangingProbe,
} from "@openstatus/health/testing";

const report = await runProbes([
  okProbe("database", true),
  failingProbe("redis"),
  hangingProbe("search"),
  myProbe({ fetch: fakeFetch({ status: 503 }) }),
]);
```

- `fakeFetch({ status?, body?, onFetch? })` — answers immediately and records each call.
- `hangFetch(track?)` — never resolves; sets `track.aborted` when the signal fires.
- `okProbe(name, critical?)`, `failingProbe(name, critical?, error?)`, `hangingProbe(name, critical?, timeoutMs?)`.

Test the endpoint, not just the probe:

```ts
const response = await handler(new Request("http://localhost/health"));
expect(response.status).toBe(503);
expect(await response.json()).toMatchObject({ status: "unhealthy" });
```

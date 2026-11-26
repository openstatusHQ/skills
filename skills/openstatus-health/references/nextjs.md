# Next.js

> Verified against Next.js 16.4.6 on 2026-11-14.
> If the project uses a newer major, read the route handler release notes before
> applying this pattern.

## Which Version

| Next.js | Install | Pattern |
| --- | --- | --- |
| 14 and 15 | `@openstatus/health @openstatus/health-next` | `healthRoute()` from the adapter |
| 16+ | `@openstatus/health` | core `createHealthHandler` in `route.ts` |

`@openstatus/health-next@0.1.4` declares a peer range of
`^14.0.0 || ^15.0.0`. Do not use it on Next.js 16. The core handler is a plain
Fetch handler and mounts directly in an App Router route.

## Next.js 16+

`app/health/route.ts`:

```ts
import { createHealthHandler } from "@openstatus/health";
import { probes } from "@/health/probes";

export const dynamic = "force-dynamic";

const handler = createHealthHandler({ probes });

export const GET = handler;
export const HEAD = handler;
```

`GET` and `HEAD` both point at the same handler. The core answers `HEAD` with
the same status and an empty body, and returns `405` with
`allow: GET, HEAD` for other methods.

`export const dynamic = "force-dynamic"` is required. Without it Next.js may
cache the route at build time and serve a stale report.

Do not set `path` in the route handler. The route file already matched the URL.

## Next.js 14–15

`app/health/route.ts`:

```ts
import { healthRoute } from "@openstatus/health-next";
import { probes } from "@/health/probes";

export const dynamic = "force-dynamic";

export const { GET, HEAD } = healthRoute({ probes });
```

`healthRoute` returns the two handlers and does not check the URL: the route
file already matched it. Do not pass `path` in a route file.

## App Router Layout

Pick the location that matches the project's existing convention:

```text
app/health/route.ts        -> /health
app/api/health/route.ts    -> /api/health
src/app/health/route.ts    -> /health
```

Use the existing path. Do not move a health endpoint that load balancers
already use.

The `probes` registry lives outside `app/`:

```text
src/health/probes.ts
lib/health/probes.ts
```

Routes import it. Never inline probes in `route.ts`.

## Registry

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

Import the same singleton clients the app uses. Do not construct a client at
module scope inside the route if the app already owns one; reuse it.

## Liveness and Readiness

```ts
// app/livez/route.ts
import { createHealthHandler } from "@openstatus/health";

export const dynamic = "force-dynamic";

export const GET = createHealthHandler({ probes: [] });
export const HEAD = GET;
```

```ts
// app/readyz/route.ts
import { createHealthHandler } from "@openstatus/health";
import { probes } from "@/health/probes";

export const dynamic = "force-dynamic";

const handler = createHealthHandler({
  probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});

export const GET = handler;
export const HEAD = handler;
```

## Public and Internal

```ts
import { createHealthHandler } from "@openstatus/health";

const handler = createHealthHandler({
  probes,
  exposeChecks: (request) =>
    request.headers.get("x-health-token") === process.env.HEALTH_TOKEN,
});

export const GET = handler;
export const HEAD = handler;
```

`degraded` still answers `200`. A public caller sees `status` and `checkedAt`
only, unless the token matches.

## Middleware Caveat

`middleware.ts` runs before route handlers. If the project's middleware
redirects unauthenticated requests, exclude the health path:

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|health|livez|readyz).*)"],
};
```

A health endpoint that returns a `307` to `/login` fails every orchestrator
check.

## Edge Runtime

The core handler and most probes run on the edge. Node-only probes do not:

- `dnsProbe`, `tcpProbe`, `tlsProbe`, `diskProbe`, `memoryProbe`.

If the route declares `export const runtime = "edge"`, keep those probes out of
the registry that route imports. Use a separate registry for the edge route, or
move the route to the Node runtime:

```ts
export const runtime = "nodejs";
```

## Avoid

- `fetch` caching: do not call the endpoint through Next's data cache.
- `revalidate` on the route. Use `dynamic = "force-dynamic"`.
- Server Actions or client components. A health endpoint is a route handler.
- Two files answering `/health`.
- Reading `process.env` inside a probe.

## Verify

```bash
curl -i http://localhost:3000/health
curl -I http://localhost:3000/health
curl -i -X POST http://localhost:3000/health
```

Check `cache-control: no-store`, the report body, and `405` plus
`allow: GET, HEAD` for `POST`.

Run `next build` and confirm `/health` is listed as dynamic, not static.

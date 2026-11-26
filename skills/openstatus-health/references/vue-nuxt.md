# Vue and Nuxt

> Verified against Nuxt 4.6.4 (h3 1.15.11, nitropack 2.13.6) on 2026-11-14.
> If the project uses a newer major, read the Nuxt server directory docs before
> applying this pattern.

## Plain Vue Cannot Host This

A Vue SPA built with Vite runs in the browser. It cannot serve `/health`. There
is no server process to probe a database.

Options when the project is plain Vue:

1. Add Nuxt. Converting is the clean path if the app already needs SSR.
2. Add a small Node server (`references/node.md`) beside the SPA and deploy it.
3. Point the health endpoint at a separate backend service.

Do not put a health endpoint in a client bundle. It will expose dependency
metadata to every visitor and it will never see the server's database.

## Nuxt 4

Nuxt server routes live in `server/routes/` and run on Nitro/h3. `server/api/`
works too and prefixes `/api`.

`server/routes/health.ts`:

```ts
import { fromWebHandler } from "h3";
import { createHealthHandler } from "@openstatus/health";
import { probes } from "../health/probes";

export default fromWebHandler(createHealthHandler({ probes }));
```

`fromWebHandler` bridges a Fetch handler (`(request: Request) => Response`) to
an h3 event handler. Nitro matches the file path, so do not set `path` on the
core handler.

The resulting endpoint answers:

```text
GET  /health  -> 200 or 503
HEAD /health  -> same status, empty body
POST /health  -> 405, allow: GET, HEAD
```

`server/routes/health.ts` matches every method. The core handler enforces the
method, so `POST` gets `405` without extra code.

## Registry

```ts
// server/health/probes.ts
import { prismaProbe } from "@openstatus/health-prisma";
import { redisProbe } from "@openstatus/health-redis";

export const probes = [
  prismaProbe({ client: usePrisma() }),
  redisProbe({ client: useRedis() }),
];
```

Do not call Nuxt composables (`useRuntimeConfig`, `useNitroApp`) inside a probe.
Resolve the client once, outside the probe, and pass it in.

If the client only exists per request, build the registry per request is wrong
for health checks. Health polls are frequent. Create one shared client at module
scope or in a Nitro plugin, then reuse it.

## Runtime Config

Read config in the server route, not in the probe:

```ts
const config = useRuntimeConfig();
const client = createClient(config.databaseUrl);
```

If the registry needs config, export a factory instead of a constant:

```ts
// server/health/probes.ts
export function createProbes(databaseUrl: string) {
  return [postgresProbe({ client: makePool(databaseUrl) })];
}
```

```ts
// server/routes/health.ts
import { fromWebHandler } from "h3";
import { createHealthHandler } from "@openstatus/health";
import { createProbes } from "../health/probes";

const config = useRuntimeConfig();
const handler = createHealthHandler({ probes: createProbes(config.databaseUrl) });

export default fromWebHandler(handler);
```

Module-scope evaluation happens once per Nitro worker. A connection pool created
there is shared across requests.

## Liveness and Readiness

`server/routes/livez.ts`:

```ts
import { fromWebHandler } from "h3";
import { createHealthHandler } from "@openstatus/health";

export default fromWebHandler(createHealthHandler({ probes: [] }));
```

`server/routes/readyz.ts`:

```ts
import { fromWebHandler } from "h3";
import { createHealthHandler } from "@openstatus/health";
import { probes } from "../health/probes";

export default fromWebHandler(
  createHealthHandler({ probes, deadlineMs: 800, cacheFailuresMs: 0 }),
);
```

## Disable Caching

Nitro does not cache routes by default, but a project may add route rules. Keep
the health path uncached:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    "/health": { cache: false, prerender: false },
    "/livez": { cache: false, prerender: false },
    "/readyz": { cache: false, prerender: false },
  },
});
```

On a fully prerendered (`nuxi generate`) deployment there is no server. Health
checks cannot run. Deploy with `nuxi build` and a Node or platform preset.

## Public and Internal

```ts
const handler = createHealthHandler({
  probes,
  exposeChecks: (request) =>
    request.headers.get("x-health-token") === process.env.HEALTH_TOKEN,
});
```

Use `process.env` in the route, not in the probe. Nitro exposes it on Node.

## h3 v2 and Standalone Nitro

`fromWebHandler` exists in both h3 v1 and h3 v2. If the project runs Nitro 3 /
h3 2 (for example a standalone Nitro app rather than Nuxt 4):

```ts
import { defineHandler } from "h3";
import { createHealthHandler } from "@openstatus/health";
import { probes } from "../health/probes";

const health = createHealthHandler({ probes });

export default defineHandler((event) => health(event.req));
```

h3 v2 handlers receive `event.req` as a standard `Request` and may return a
`Response` directly. `fromWebHandler` remains the least surprising choice when
it is available.

## Avoid

- A health route in `pages/` or `components/`. It must be a server route.
- `useAsyncData`, `useFetch`, or any client composable.
- Importing a probe in a file that Nuxt bundles for the client.
- `prerender: true` or `nuxi generate`.
- Node-only probes (`dns`, `tcp`, `tls`, `disk`, `memory`) on a Cloudflare
  Workers preset.

## Verify

```bash
npm run build
node .output/server/index.mjs
curl -i http://localhost:3000/health
curl -I http://localhost:3000/health
curl -i -X POST http://localhost:3000/health
```

Confirm the health route is in the server output, not the client bundle. Search
`.output/public/` for the probe package names; they must not appear there.

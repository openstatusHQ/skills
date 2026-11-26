# Astro

> Verified against Astro 7.4.12 on 2026-11-14.
> If the project uses a newer major, read the endpoints release notes before
> applying this pattern.

## Requirement

Astro endpoints run on the server. The project needs an SSR adapter
(`@astrojs/node`, `@astrojs/vercel`, `@astrojs/cloudflare`, `@astrojs/netlify`)
and `output` that is not purely static. A fully static build has no runtime to
run probes.

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
});
```

`output: "hybrid"` also works: endpoints opt into the server with
`prerender = false`, pages stay static.

## Endpoint

`src/pages/health.ts`:

```ts
import type { APIRoute } from "astro";
import { createHealthHandler } from "@openstatus/health";
import { probes } from "../health/probes";

export const prerender = false;

const handler = createHealthHandler({ probes });

export const GET: APIRoute = ({ request }) => handler(request);
export const HEAD: APIRoute = ({ request }) => handler(request);
```

The core handler takes a Fetch `Request`. Astro's `APIRoute` receives an
`APIContext`, so pass `context.request`, not the context.

Do not pass `path`. Astro already matched the file to the URL. The core handler
answers every URL when `path` is unset.

## `prerender = false`

Required when `output` is `"static"` or `"hybrid"`. Without it Astro tries to
prerender the endpoint at build time and the probes never run.

An endpoint with `prerender = false` is a server route. It is not cached by
Astro.

## Route Location

| File | URL |
| --- | --- |
| `src/pages/health.ts` | `/health` |
| `src/pages/api/health.ts` | `/api/health` |
| `src/pages/livez.ts` | `/livez` |

Keep the existing URL if one is already deployed.

## Registry

```ts
// src/health/probes.ts
import { postgresProbe } from "@openstatus/health-postgres";
import { redisProbe } from "@openstatus/health-redis";
import { db } from "../lib/db";
import { redis } from "../lib/redis";

export const probes = [
  postgresProbe({ client: db }),
  redisProbe({ client: redis }),
];
```

Relative imports work in Astro. If the project uses path aliases from
`tsconfig.json`, use those instead.

## Liveness and Readiness

`src/pages/livez.ts`:

```ts
import type { APIRoute } from "astro";
import { createHealthHandler } from "@openstatus/health";

export const prerender = false;

const handler = createHealthHandler({ probes: [] });

export const GET: APIRoute = ({ request }) => handler(request);
export const HEAD: APIRoute = ({ request }) => handler(request);
```

`src/pages/readyz.ts`:

```ts
import type { APIRoute } from "astro";
import { createHealthHandler } from "@openstatus/health";
import { probes } from "../health/probes";

export const prerender = false;

const handler = createHealthHandler({
  probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});

export const GET: APIRoute = ({ request }) => handler(request);
export const HEAD: APIRoute = ({ request }) => handler(request);
```

## Public and Internal

```ts
const handler = createHealthHandler({
  probes,
  exposeChecks: () => false,
});
```

For the token form, read the header from the Fetch request:

```ts
const handler = createHealthHandler({
  probes,
  exposeChecks: (request) =>
    request.headers.get("x-health-token") === import.meta.env.HEALTH_TOKEN,
});
```

`import.meta.env` is available on the server in Astro. Prefer injecting the
result through a module the probe registry reads, so the probe itself never
touches the environment.

## Adapter Notes

- **`@astrojs/node`**: `standalone` or `middleware` mode both expose endpoints.
  Behind a reverse proxy, confirm the proxy forwards `GET /health` and `HEAD
  /health` without rewriting the path.
- **`@astrojs/vercel`**: serverless functions handle the endpoint. Cold starts
  add latency to the first probe. Keep `deadlineMs` below the platform timeout.
- **`@astrojs/cloudflare`**: Workers runtime. Do not import `node:dns`,
  `node:net`, `node:tls`, `node:fs`, or `node:v8` probes.
- **`@astrojs/netlify`**: functions run on Node. Node-only probes are fine.

## Avoid

- `prerender = true` or omitting `prerender` in a static build.
- Passing the `APIContext` to the core handler. It expects a `Request`.
- Returning `new Response(JSON.stringify(...))` by hand. The core sets
  `content-type: application/json` and `cache-control: no-store`.
- Mounting a second `/health` in `src/pages/` and in the adapter config.

## Verify

```bash
npm run build
npm run preview
curl -i http://localhost:4321/health
curl -I http://localhost:4321/health
curl -i -X POST http://localhost:4321/health
```

Confirm the build output marks the route as server-rendered, not prerendered.

# Node.js and Other Servers

> Verified against Node.js 22+ and `@openstatus/health` 0.1.4 on 2026-11-14.

`@openstatus/health` requires Node >= 22. The core handler is a Fetch handler,
so it also mounts on Bun, Deno, and Workers.

## Plain `node:http`

There is no adapter for `node:http`. Use `createHealthResponder`.

```ts
// server.ts
import { createServer } from "node:http";
import { createHealthResponder } from "@openstatus/health";
import { probes } from "./health/probes";

const responder = createHealthResponder({ probes });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname !== "/health") {
    res.writeHead(404).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" }).end();
    return;
  }

  const { status, headers, body } = await responder.respond(req);

  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : JSON.stringify(body));
});

server.listen(3000);
```

`respond(ctx)` does not check the path or method. You do. `Ctx` is the request
type passed to `extend` and the function form of `exposeChecks`.

`body` is a plain object, not a string. `JSON.stringify` it for `node:http`.
Express, Fastify, and Nest serialize an object for you.

The built-in `createHealthHandler` does path and method checks for you:

```ts
import { createHealthHandler } from "@openstatus/health";

const handler = createHealthHandler({ path: "/health", probes });

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
  });

  const response = await handler(request);

  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
});
```

Converting a Node `IncomingMessage` into a `Request` by hand loses the body.
Health checks have no request body, so this is safe. Do not use this bridge for
routes that accept uploads.

## Express

Install `@openstatus/health @openstatus/health-express`:

```ts
import express from "express";
import { healthRoute } from "@openstatus/health-express";
import { probes } from "./health/probes";

const app = express();

app.use(healthRoute({ probes }));

app.listen(3000);
```

`healthRoute` mounts `GET` and `HEAD` on `options.path` (default `/health`) and
answers `405` for other methods.

Mount it before body parsers and auth middleware. A load balancer should not
need a session cookie to read health.

Custom path:

```ts
app.use(healthRoute({ path: "/_health", probes, exposeChecks: false }));
```

## Fastify

No adapter. Use `createHealthResponder`:

```ts
import Fastify, { type FastifyRequest } from "fastify";
import { createHealthResponder } from "@openstatus/health";
import { probes } from "./health/probes";

const responder = createHealthResponder<FastifyRequest>({ probes });
const app = Fastify();

app.route({
  method: ["GET", "HEAD"],
  url: "/health",
  handler: async (request, reply) => {
    const { status, headers, body } = await responder.respond(request);
    reply.code(status);
    for (const [key, value] of Object.entries(headers)) {
      reply.header(key, value);
    }
    return request.method === "HEAD" ? reply.send() : reply.send(body);
  },
});

await app.listen({ port: 3000 });
```

Fastify handles `HEAD` by dropping the body, but sending it explicitly avoids
double work.

Add a `405` handler for the path when the project requires it:

```ts
app.setNotFoundHandler((request, reply) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/health") {
    return reply.code(405).header("allow", "GET, HEAD").send();
  }
  return reply.code(404).send();
});
```

## Hono

Install `@openstatus/health @openstatus/health-hono`:

```ts
import { Hono } from "hono";
import { healthRoute } from "@openstatus/health-hono";
import { probes } from "./health/probes";

const app = new Hono();

app.route("/", healthRoute({ probes }));

export default app;
```

Register the health route before auth middleware:

```ts
app.route("/", healthRoute({ probes }));
app.use("*", authMiddleware);
```

## Elysia

Install `@openstatus/health @openstatus/health-elysia`:

```ts
import { Elysia } from "elysia";
import { healthRoute } from "@openstatus/health-elysia";
import { probes } from "./health/probes";

new Elysia().use(healthRoute({ probes })).listen(3000);
```

## Bun

```ts
import { createHealthHandler } from "@openstatus/health";
import { probes } from "./health/probes";

const handler = createHealthHandler({ path: "/health", probes });

Bun.serve({ port: 3000, fetch: handler });
```

## Deno

```ts
import { createHealthHandler } from "@openstatus/health";
import { probes } from "./health/probes";

Deno.serve(createHealthHandler({ path: "/health", probes }));
```

Use an `npm:` specifier for the package, or install it with the project's
package manager if Deno runs in Node compatibility mode.

## Workers

Use `createLazyHealthHandler` when configuration lives in `fetch(request, env)`.
Building the handler per request throws away `cacheMs` and runs every probe on
every poll.

```ts
import { createLazyHealthHandler } from "@openstatus/health";
import { createProbes } from "./health/probes";

export default {
  fetch: createLazyHealthHandler<Request, Env>((env) => ({
    probes: createProbes(env),
  })),
};
```

Add hosting metadata with the platform package:

```ts
import { cloudflareExtend } from "@openstatus/health-cloudflare";

fetch: createLazyHealthHandler<Request, Env>((env) => ({
  probes: createProbes(env),
  extend: cloudflareExtend({ version: env.CF_VERSION_METADATA }),
})),
```

## Liveness and Readiness

Mount twice. The core handler answers its own path.

```ts
const live = createHealthHandler({ path: "/livez", probes: [] });
const ready = createHealthHandler({
  path: "/readyz",
  probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});
```

With `@openstatus/health-express`:

```ts
app.use(healthRoute({ path: "/livez", probes: [] }));
app.use(healthRoute({ path: "/readyz", probes, deadlineMs: 800, cacheFailuresMs: 0 }));
```

## Avoid

- Registering the health route after auth or rate limiting.
- Calling `responder.respond()` without checking the path. It will answer
  `/health`-shaped JSON on every URL.
- Building a pool per request.
- `server.close()` on a timer that races an in-flight probe. Probes have
  timeouts; let them finish or abort them.
- Using the hand-rolled `IncomingMessage` to `Request` bridge for routes that
  read a body.

## Verify

```bash
curl -i http://localhost:3000/health
curl -I http://localhost:3000/health
curl -i -X POST http://localhost:3000/health
```

Against Express, Fastify, Hono, and Elysia, confirm the framework's own `404`
handler does not shadow the health path.

# NestJS

> Verified against NestJS 12.5.0 (Express 5) on 2026-11-14.
> If the project uses a newer major, read the controllers docs before applying
> this pattern.

There is no `@openstatus/health-nest` adapter. Write one small adapter over
`createHealthResponder`. It is 20 lines and keeps the core behavior.

## Install

```bash
npm install @openstatus/health
```

Add probe packages as needed. The core needs Node >= 22.

## Probes as a Provider

Do not import clients into the controller. Nest already manages them. Provide
the probe array as a token so `HealthModule` can inject the services it needs.

```ts
// src/health/health.probes.ts
import { prismaProbe } from "@openstatus/health-prisma";
import { redisProbe } from "@openstatus/health-redis";
import type { Probe } from "@openstatus/health";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export const HEALTH_PROBES = Symbol("HEALTH_PROBES");

export function createProbes(
  prisma: PrismaService,
  redis: RedisService,
): Probe[] {
  return [
    prismaProbe({ client: prisma }),
    redisProbe({ client: redis }),
  ];
}
```

```ts
// src/health/health.module.ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HEALTH_PROBES, createProbes } from "./health.probes";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HEALTH_PROBES,
      useFactory: createProbes,
      inject: [PrismaService, RedisService],
    },
  ],
})
export class HealthModule {}
```

Register `HealthModule` in `AppModule`. The probe array is built once at
bootstrap and shared by every request.

## Controller

```ts
// src/health/health.controller.ts
import {
  Controller,
  Get,
  Head,
  Inject,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  createHealthResponder,
  type HealthResponder,
} from "@openstatus/health";
import { HEALTH_PROBES } from "./health.probes";
import type { Probe } from "@openstatus/health";

@Controller()
export class HealthController {
  private readonly responder: HealthResponder<Request>;

  constructor(@Inject(HEALTH_PROBES) probes: Probe[]) {
    this.responder = createHealthResponder<Request>({ probes });
  }

  @Get("health")
  getHealth(@Req() req: Request, @Res() res: Response) {
    return this.respond(req, res);
  }

  @Head("health")
  headHealth(@Req() req: Request, @Res() res: Response) {
    return this.respond(req, res);
  }

  private async respond(req: Request, res: Response) {
    const { status, headers, body } = await this.responder.respond(req);

    res.status(status);
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    res.send(req.method === "HEAD" ? undefined : body);
  }
}
```

`@Res()` opts out of Nest's automatic response handling. That is intended: the
core owns the status code, headers, and body.

`HealthResponder<Request>` is the return type of
`createHealthResponder<Request>(...)`. If the type is not exported in the
installed version, use `ReturnType<typeof createHealthResponder<Request>>`.

## Fastify Platform

With `@nestjs/platform-fastify`, `@Res()` gives a `FastifyReply`:

```ts
import type { FastifyReply, FastifyRequest } from "fastify";

@Get("health")
getHealth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
  return this.respond(req, reply);
}

private async respond(req: FastifyRequest, reply: FastifyReply) {
  const { status, headers, body } = await this.responder.respond(req);

  reply.code(status);
  for (const [key, value] of Object.entries(headers)) {
    reply.header(key, value);
  }
  return reply.send(req.method === "HEAD" ? undefined : body);
}
```

`createHealthResponder<FastifyRequest>` keeps `extend` and `exposeChecks`
typed.

## Global Prefix

`app.setGlobalPrefix("api")` turns the route into `/api/health`. Keep `/health`
stable for the load balancer by excluding it:

```ts
app.setGlobalPrefix("api", { exclude: ["health", "livez", "readyz"] });
```

## Global Auth Guard

A global `APP_GUARD` applies to the health controller too. Mark the route public
with the project's own decorator:

```ts
@Public()
@Get("health")
getHealth(@Req() req: Request, @Res() res: Response) {
  return this.respond(req, res);
}
```

If the project has no public decorator, register the health controller outside
the guarded scope, or exempt the path in the guard. A load balancer cannot
satisfy an end-user session guard.

## Liveness and Readiness

Use separate controllers or separate methods with their own responder.

```ts
private readonly live = createHealthResponder<Request>({ probes: [] });
private readonly ready = createHealthResponder<Request>({
  probes: this.probes,
  deadlineMs: 800,
  cacheFailuresMs: 0,
});
```

Store `probes` from the constructor:

```ts
constructor(@Inject(HEALTH_PROBES) private readonly probes: Probe[]) {
  this.responder = createHealthResponder<Request>({ probes });
  this.live = createHealthResponder<Request>({ probes: [] });
  this.ready = createHealthResponder<Request>({
    probes,
    deadlineMs: 800,
    cacheFailuresMs: 0,
  });
}
```

Expose `GET livez`, `HEAD livez`, `GET readyz`, `HEAD readyz` the same way.

## Public and Internal

```ts
this.responder = createHealthResponder<Request>({
  probes,
  exposeChecks: (req) =>
    req.headers["x-health-token"] === process.env.HEALTH_TOKEN,
});
```

`Request` here is the Express request. Headers are lowercased.

## Avoid

- A `HealthService` that constructs a new database client per call.
- `@Res({ passthrough: true })` plus returning a value. The core already set the
  body.
- Nest interceptors that wrap the response. `@Res()` skips them, which is what
  you want for health.
- Putting the controller behind a global rate limiter.
- Duplicating probe definitions in both `health.controller.ts` and
  `health.module.ts`.

## Verify

```bash
npm run start
curl -i http://localhost:3000/health
curl -I http://localhost:3000/health
curl -i -X POST http://localhost:3000/health
```

Confirm the global prefix and auth guard do not change the health path, and that
`POST /health` returns `405`, not a Nest `404`.

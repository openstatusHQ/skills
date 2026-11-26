# Probes

Choose probes from the generated catalog, then map the project's dependencies to
packages with the table below.

> Catalog synced from `openstatusHQ/health` at commit `dd98e237d9336b5f603fd60e7c07c1c19e74d65d` on 2026-11-14. Packages are at `0.1.4`.
> Refresh it with `node scripts/sync-probes.mjs`. Do not hand-edit the generated block.

## Generated Catalog

<!-- BEGIN GENERATED: probe-catalog -->
<!-- upstream: openstatusHQ/health@dd98e237d9336b5f603fd60e7c07c1c19e74d65d synced: 2026-11-14 -->
### Server adapters

| Package | Description |
| ------- | ----------- |
| `@openstatus/health-hono` | Hono adapter |
| `@openstatus/health-elysia` | Elysia adapter |
| `@openstatus/health-express` | Express 4 / 5 adapter |
| `@openstatus/health-next` | Next.js App Router adapter |
| `@openstatus/health-tanstack-start` | TanStack Start adapter |

### Probe packages

Every factory also takes `name`, `critical`, `timeoutMs` and `skip`.

#### Databases

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `clickhouseProbe({ client, select? })` | `clickhouse` | no | `client.ping({ select: true })` on a `@clickhouse/client` client |
| `convexProbe({ url, path, args?, token? })` | `database` | yes | `POST {url}/api/query` running `path` answers `status: "success"` |
| `d1Probe({ db })` | `database` | yes | `db.prepare("select 1").first()` on a Workers `D1Database` binding |
| `drizzleProbe({ db })` | `database` | yes | `db.execute(sql\`select 1\`)` or `db.run(...)` |
| `mongodbProbe({ client, db? })` | `database` | yes | `client.db("admin").command({ ping: 1 })` on a `MongoClient` |
| `mysqlProbe({ client })` | `database` | yes | `client.query("select 1")` on a `mysql2/promise` pool or connection |
| `neonProbe({ client })` | `database` | yes | `client.query("select 1")` on `neon()`, or a Neon `Pool` / `Client` |
| `planetscaleProbe({ connection })` | `database` | yes | `connection.execute("select 1")` on a `@planetscale/database` connection |
| `postgresProbe({ client })` | `database` | yes | `client.query("select 1")` on a `pg` pool, or `sql.unsafe("select 1")` on postgres.js |
| `prismaProbe({ client })` | `database` | yes | `client.$queryRawUnsafe("select 1")`, or `client.$runCommandRaw({ ping: 1 })` on MongoDB |
| `supabaseProbe({ client, maxConnectionPercent? })` | `supabase` | no | `rpc("health_connection_pressure")` ≤ threshold |
| `tinybirdProbe({ baseUrl? })` | `tinybird` | no | `GET {baseUrl}/v0/health` |
| `tursoProbe({ client })` | `database` | yes | `client.execute("select 1")` on a Turso libSQL client |
| `tursoServerlessProbe({ connection })` | `database` | yes | `connection.get("select 1")` on a Turso serverless `Connection` |

#### Caches & KV

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `kvProbe({ namespace, key? })` | `kv` | no | `namespace.get("health")` on a Workers `KVNamespace` binding |
| `redisProbe({ client })` | `redis` | no | `client.ping()` answers `PONG` on a node-redis, ioredis or Upstash client |
| `upstashProbe({ url, token })` | `redis` | no | `GET {url}/ping` with the REST token |

#### Object storage

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `r2Probe({ bucket, key? })` | `storage` | no | `bucket.head(key ?? "health")` on a Workers `R2Bucket` binding |
| `s3Probe({ client, bucket })` | `storage` | no | `client.send(new HeadBucketCommand({ Bucket }))` on an `S3Client` |

#### Queues & workflows

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `bullmqProbe({ queue, maxWaiting? })` | `queue` | no | `queue.getWaitingCount()` on a BullMQ `Queue`, ≤ threshold |
| `inngestProbe({ signingKey, baseUrl? })` | `inngest` | no | `GET {baseUrl}/v1/events?limit=1` with the signing key |
| `qstashProbe({ token, baseUrl? })` | `qstash` | no | `GET {baseUrl}/v2/queues` with the token |
| `triggerDevProbe({ secretKey, baseUrl? })` | `trigger` | no | `GET {baseUrl}/api/v1/runs?page[size]=1` with the secret key |

#### Messaging

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `kafkaProbe({ admin })` | `kafka` | no | `admin.describeCluster()` lists ≥ 1 broker on a connected KafkaJS `Admin` |
| `natsProbe({ connection })` | `nats` | no | `connection.flush()` on an open `NatsConnection` |

#### Search

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `algoliaProbe({ appId, apiKey, baseUrl? })` | `search` | no | `GET {baseUrl}/1/isalive` with the app headers; `baseUrl` defaults to `https://{appId}-dsn.algolia.net` |
| `meilisearchProbe({ host, apiKey? })` | `search` | no | `GET {host}/health` answers `status: "available"` |
| `typesenseProbe({ host, apiKey? })` | `search` | no | `GET {host}/health` answers `ok: true` |

#### SaaS APIs

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `anthropicProbe({ apiKey, baseUrl? })` | `anthropic` | no | `GET {baseUrl}/v1/models` with the `x-api-key` header |
| `clerkProbe({ secretKey, baseUrl? })` | `clerk` | no | `GET {baseUrl}/v1/users?limit=1` with the secret key |
| `openaiProbe({ apiKey, baseUrl? })` | `openai` | no | `GET {baseUrl}/v1/models` with the API key |
| `posthogProbe({ personalApiKey, baseUrl? })` | `posthog` | no | `GET {baseUrl}/api/projects/@current/` with the personal API key |
| `resendProbe({ apiKey, baseUrl? })` | `resend` | no | `GET {baseUrl}/domains` with the API key |
| `sentryProbe({ token?, baseUrl? })` | `sentry` | no | `GET {baseUrl}/api/0/`, with the auth token when given |
| `stripeProbe({ secretKey, baseUrl? })` | `stripe` | no | `GET {baseUrl}/v1/balance` with the secret key |
| `unkeyProbe({ baseUrl? })` | `unkey` | no | `GET {baseUrl}/v2/liveness` |
| `workosProbe({ apiKey, baseUrl? })` | `workos` | no | `GET {baseUrl}/organizations?limit=1` with the API key |

#### Network & protocols

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `dnsProbe({ hostname, lookup? })` | `dns` | no | `dns.promises.lookup(hostname)` returns an address |
| `grpcProbe({ client, service? })` | `grpc` | no | `client.check({ service })` answers `SERVING` on a `grpc.health.v1.Health` client |
| `tcpProbe({ host, port })` | `tcp` | no | a TCP connection to `host:port` is accepted |
| `tlsProbe({ host, port?, minDaysValid? })` | `tls` | no | a TLS handshake with a trusted certificate valid ≥ `minDaysValid` days |

#### System

| Probe | Default name | Critical | Checks |
| ----- | ------------ | -------- | ------ |
| `diskProbe({ path?, minFreePercent?, minFreeBytes? })` | `disk` | no | free space of the filesystem holding `path` ≥ threshold |
| `memoryProbe({ maxHeapUsedPercent?, maxRssBytes? })` | `memory` | no | heap in use ≤ 90% of the V8 heap limit by default; RSS ≤ budget only when `maxRssBytes` is set |

Every probe factory accepts `name`, `critical`, `timeoutMs` and `skip`
overrides. Probes take a client instance, a base URL or, for `tcpProbe`, a
host and port — they never read `process.env` themselves.
<!-- END GENERATED: probe-catalog -->

## Dependency to Probe Map

Match the project's dependencies against the left column. Install the package in
the right column, import its factory, and add one line to the registry.

| Detected dependency | Package | Factory | Critical |
| --- | --- | --- | --- |
| `@prisma/client`, `prisma` | `@openstatus/health-prisma` | `prismaProbe` | yes |
| `drizzle-orm` | `@openstatus/health-drizzle` | `drizzleProbe` | yes |
| `pg`, `postgres` | `@openstatus/health-postgres` | `postgresProbe` | yes |
| `@neondatabase/serverless` | `@openstatus/health-neon` | `neonProbe` | yes |
| `mysql2` | `@openstatus/health-mysql` | `mysqlProbe` | yes |
| `mongodb` | `@openstatus/health-mongodb` | `mongodbProbe` | yes |
| `@libsql/client` | `@openstatus/health-turso` | `tursoProbe` | yes |
| `@tursodatabase/serverless` | `@openstatus/health-turso-serverless` | `tursoServerlessProbe` | yes |
| `@planetscale/database` | `@openstatus/health-planetscale` | `planetscaleProbe` | yes |
| `@clickhouse/client` | `@openstatus/health-clickhouse` | `clickhouseProbe` | yes |
| `convex` | `@openstatus/health-convex` | `convexProbe` | yes |
| `@supabase/supabase-js` | `@openstatus/health-supabase` | `supabaseProbe` | no |
| `@tinybirdco/sdk` | `@openstatus/health-tinybird` | `tinybirdProbe` | no |
| `redis`, `ioredis` | `@openstatus/health-redis` | `redisProbe` | no |
| `@upstash/redis` | `@openstatus/health-upstash` | `upstashProbe` | no |
| `@aws-sdk/client-s3` | `@openstatus/health-s3` | `s3Probe` | no |
| `bullmq` | `@openstatus/health-bullmq` | `bullmqProbe` | no |
| `inngest` | `@openstatus/health-inngest` | `inngestProbe` | no |
| `@upstash/qstash` | `@openstatus/health-qstash` | `qstashProbe` | no |
| `@trigger.dev/sdk` | `@openstatus/health-trigger-dev` | `triggerDevProbe` | no |
| `kafkajs` | `@openstatus/health-kafka` | `kafkaProbe` | no |
| `nats`, `@nats-io/transport-node` | `@openstatus/health-nats` | `natsProbe` | no |
| `algoliasearch` | `@openstatus/health-algolia` | `algoliaProbe` | no |
| `meilisearch` | `@openstatus/health-meilisearch` | `meilisearchProbe` | no |
| `typesense` | `@openstatus/health-typesense` | `typesenseProbe` | no |
| `@anthropic-ai/sdk` | `@openstatus/health-anthropic` | `anthropicProbe` | no |
| `openai` | `@openstatus/health-openai` | `openaiProbe` | no |
| `@clerk/backend` | `@openstatus/health-clerk` | `clerkProbe` | no |
| `posthog-node`, `posthog-js` | `@openstatus/health-posthog` | `posthogProbe` | no |
| `resend` | `@openstatus/health-resend` | `resendProbe` | no |
| `@sentry/node`, `@sentry/nextjs` | `@openstatus/health-sentry` | `sentryProbe` | no |
| `stripe` | `@openstatus/health-stripe` | `stripeProbe` | no |
| `@unkey/api` | `@openstatus/health-unkey` | `unkeyProbe` | no |
| `@workos-inc/node` | `@openstatus/health-workos` | `workosProbe` | no |
| `@grpc/grpc-js` | `@openstatus/health-grpc` | `grpcProbe` | no |

Workers bindings have no npm dependency. Detect them from the framework config
instead:

| Detected binding | Package | Factory | Critical |
| --- | --- | --- | --- |
| `D1Database` (`wrangler.toml` `d1_databases`) | `@openstatus/health-cloudflare-d1` | `d1Probe` | yes |
| `KVNamespace` (`wrangler.toml` `kv_namespaces`) | `@openstatus/health-cloudflare-kv` | `kvProbe` | no |
| `R2Bucket` (`wrangler.toml` `r2_buckets`) | `@openstatus/health-cloudflare-r2` | `r2Probe` | no |

No probe package exists for a dependency? Write a custom probe with `probe()` or
`httpProbe()` from the core. See `core-api.md`.

## Runtime Compatibility

| Probe group | Runtime | Notes |
| --- | --- | --- |
| Databases, caches, storage, queues, messaging, search, SaaS | Node >= 22, Bun, Deno, Workers | Probe package only needs its own client and `fetch` |
| `dnsProbe`, `tcpProbe`, `tlsProbe` | Node only | Uses `node:dns`, `node:net`, `node:tls` |
| `diskProbe` | Node only | Uses `node:fs` `statfs` |
| `memoryProbe` | Node only | Uses `node:process`, `node:v8` |
| `cloudflare-*` probes | Workers only | Need the binding object from `env` |

Edge-runtime routes must not import Node-only probes. Importing `node:dns` in a
Workers bundle fails at build time. Keep Node-only probes behind a separate
registry file if the project deploys to both.

## Criticality Defaults

| Dependency kind | Critical | Reason |
| --- | --- | --- |
| Primary database | yes | The instance cannot serve without it |
| Primary cache or session store | depends | Critical when sessions die with it; non-critical when it is a pure speed layer |
| Object storage | no, unless uploads are the product | Degrade, do not drain the pool |
| Search, email, analytics, AI, payments | no, unless checkout is the product | Degraded is enough |
| Queue producer | no | Degraded while the backlog drains |
| Custom business dependency | ask | Only the caller knows the routing consequence |

When unsure, default to non-critical. A false `unhealthy` removes healthy
instances from rotation. A false `degraded` shows on the dashboard without
taking the service down.

## Custom Probes

When no package fits, write a probe. Resolve for healthy, reject for failed,
and honour the abort signal.

```ts
import { probe } from "@openstatus/health";

const queue = probe({
  name: "queue",
  critical: false,
  timeoutMs: 1000,
  skip: () => !process.env.QUEUE_URL,
  run: async (signal, ctx) => {
    const res = await fetch(`${process.env.QUEUE_URL}/depth`, { signal });
    if (!res.ok) throw new Error(`${ctx.name} answered ${res.status}`);
    const { depth } = await res.json();
    if (depth > 10_000) throw new Error(`queue depth ${depth}`);
  },
});
```

`httpProbe` covers plain reachability without writing `fetch` code:

```ts
import { httpProbe } from "@openstatus/health";

const docs = httpProbe({
  name: "docs",
  url: "https://docs.example.com",
  method: "HEAD",
  expectStatus: 200,
  critical: false,
});
```

Test both with the doubles from `@openstatus/health/testing`:
`fakeFetch`, `hangFetch`, `okProbe`, `failingProbe`, `hangingProbe`. See
`core-api.md`.

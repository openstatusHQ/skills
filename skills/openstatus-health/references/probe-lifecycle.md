# Probe Lifecycle

How probes get created, updated, and kept correct after the first run.

The skill is a set of instructions, not a daemon. It does not watch the project.
A new dependency is invisible to `/health` until someone adds a probe. Every
layer below exists to make that gap visible and cheap to close.

## Modes

| Mode | Trigger | Result |
| --- | --- | --- |
| **Bootstrap** | New project, "add a health endpoint" | Registry file, route, installed probe packages |
| **Audit** | Existing `/health`, "update probes", "I added Redis" | Diff of dependencies vs registry, missing probes added, custom probes preserved |
| **Refresh** | Maintainer "sync health catalog" | Updated generated catalog block and manifest commit |

Bootstrap and audit share one inventory step. Only the write path differs.

## Inventory

Run this before touching code.

1. **Framework and runtime.** Read `package.json`, the lockfile, and the
   framework config. Detect `next`, `astro`, `nuxt`, `nitro`, `h3`,
   `@nestjs/core`, `hono`, `express`, `fastify`, `elysia`, and the hosting
   target (Vercel, Cloudflare, Fly, Node server).
2. **Dependencies.** Collect `dependencies` and `devDependencies`. Match them
   against the dependency map in `probes.md`.
3. **Workers bindings.** Read `wrangler.toml` / `wrangler.jsonc` for
   `d1_databases`, `kv_namespaces`, and `r2_buckets`.
4. **Existing health route.** Search the repo:

   ```text
   createHealthHandler, createHealthResponder, createHealthCheck,
   createLazyHealthHandler, healthRoute, runProbes,
   /health, /livez, /readyz, /healthz, /_health
   ```

5. **Existing registry.** Search for the project's probe array:
   `src/health/probes`, `lib/health/probes`, `health/probes`, or an inline
   `probes: [...]` in the route.
6. **Env usage.** Find where the project already constructs database, cache,
   storage, and SaaS clients. Reuse those clients. Do not build a second pool.

Output of inventory is a diff:

```text
framework   next 16.4  (App Router)
runtime     node 22
route       app/api/health/route.ts  (exists, boolean 200/500)
registry    none
deps        @prisma/client  -> prismaProbe       installed? no
            ioredis         -> redisProbe        installed? no
            stripe          -> stripeProbe       installed? no
custom      none
```

## Bootstrap

1. Run the inventory.
2. Map every probe-able dependency to a package and a factory.
3. Set criticality from the defaults in `probes.md`. Ask only when the answer
   changes routing behavior.
4. Install the core, the adapter if one matches, and the matched probe
   packages. Do not install probes for dependencies the project does not use.
5. Write one registry file. Conventional locations:
   - Next.js: `src/health/probes.ts` or `lib/health/probes.ts` (match the
     project's alias layout).
   - Astro: `src/health/probes.ts`.
   - Nuxt: `server/health/probes.ts`.
   - Node / Express: `src/health/probes.ts`.
   - NestJS: `src/health/probes.ts`.
6. Mount the route from the framework reference. The route imports the registry
   and contains no probe definitions.
7. Verify with `GET`, `HEAD`, and `POST`. See `SKILL.md`.

Registry shape:

```ts
// src/health/probes.ts
import { prismaProbe } from "@openstatus/health-prisma";
import { redisProbe } from "@openstatus/health-redis";
import { stripeProbe } from "@openstatus/health-stripe";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const probes = [
  prismaProbe({ client: db }),
  redisProbe({ client: redis }),
  stripeProbe({ secretKey: process.env.STRIPE_SECRET_KEY! }),
];
```

That is the whole update surface. A new dependency is one import and one line.

## Audit

Use when the project already has a health endpoint or when a dependency was
added after bootstrap.

1. Run the inventory.
2. Compare the registry against the dependency map.
3. For each probe-able dependency with no matching probe, add it. Reuse the
   existing client from the composition root.
4. For each registry entry whose dependency is gone, remove it. Confirm before
   deleting a custom probe.
5. Keep the existing route URL and status-code contract. Load balancers,
   Kubernetes probes, and monitors point at them.
6. Report the diff. Do not rewrite unrelated parts of the route.

### Migrating a boolean health route

Existing pattern:

```ts
export async function GET() {
  try {
    await db.query("select 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
```

Audit result:

- Keep the path. Keep `200` for healthy and `503` for unavailable.
- Keep any dashboard that reads `{ ok: true }` working with `extend`:

```ts
const check = createHealthCheck({ probes });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { status, headers, body } = await createHealthResponder({ check }).respond(request);
  const report = JSON.parse(body);
  return Response.json({ ...report, ok: status === 200 }, { status, headers });
}
```

- If the old route returned `500`, map `unhealthyStatusCode: 500` for one
  release, then move to `503`.
- Never leave two implementations on the same path.

### Rules

- Never delete a custom probe. Move it into the registry if it is inline.
- Never duplicate a probe already in the registry. Names must stay unique.
- Do not change criticality silently. State the change and why.
- Probes that read `process.env` move to client injection plus `skip`.
- Do not build clients inside `run()`. That leaks connections on every poll.

## New Dependency After the Skill Ran

Three layers, in order of cost.

### Layer 1: Re-run audit mode

Trigger phrases: "I added Redis", "update health probes", "audit the health
endpoint". The skill re-runs the inventory and produces the diff. No state is
stored between runs, so nothing goes stale on disk.

### Layer 2: Optional coverage check

Only scaffold this when the user asks for drift protection. The skill does not
add it silently.

```bash
cp <skill-dir>/assets/check-health-coverage.mjs scripts/check-health-coverage.mjs
```

```json
{
  "scripts": {
    "check:health": "node scripts/check-health-coverage.mjs"
  }
}
```

Behavior:

- Reads `package.json` dependencies.
- Maps them with the same dependency table.
- Reads the registry file text.
- Fails when a critical dependency has no probe.
- Warns when a non-critical dependency has no probe.
- Warns, never fails, for dependencies missing from the mapping table.

This catches "added Postgres, forgot the probe" at PR time. It cannot discover
a probe package that the mapping table does not know about. Update the mapping
table in `probes.md`, then re-copy the asset.

Run it:

```bash
node scripts/check-health-coverage.mjs
```

### Layer 3: Refresh the skill catalog

For maintainers of this skill repo, after an upstream release:

```bash
node skills/openstatus-health/scripts/sync-probes.mjs
```

The script fetches the upstream README, rewrites only the block between
`<!-- BEGIN GENERATED: probe-catalog -->` and
`<!-- END GENERATED: probe-catalog -->`, and records the upstream commit in
`references/manifest.json`.

```bash
node skills/openstatus-health/scripts/sync-probes.mjs --check
```

`--check` exits non-zero when the upstream commit differs from the recorded
snapshot. Run it manually before a release. There is no scheduled workflow.

## Runtime Behavior

- No auto-discovery. A dependency without a probe does not appear in `/health`.
- No background refresh. Probes run only when the endpoint is called.
- The catalog is a snapshot. `SKILL.md` prints the snapshot date and commit when
  the network is unavailable.

## Verify

After bootstrap or audit:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
curl -i http://localhost:3000/health
```

Check the registry imports match installed packages, probe names are unique, and
the route still answers `GET`, `HEAD`, and `405` for other methods.

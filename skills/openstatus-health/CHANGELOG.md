# Changelog

## 0.1.0 — 2026-11-14

Initial release.

### Added

- Umbrella skill for `@openstatus/health` with three modes: bootstrap, audit,
  and refresh.
- Framework references:
  - Next.js 16.4.6 (core handler) and 14–15 (`@openstatus/health-next`).
  - Astro 7.4.12 (endpoint with `prerender = false`).
  - Nuxt 4.6.4 / h3 1.15.11 / Nitro 2.13.6 (`server/routes` plus
    `fromWebHandler`).
  - Node.js 22+, Express, Fastify, Hono, Elysia, Bun, Deno, Workers.
  - NestJS 12.5.0 (custom adapter over `createHealthResponder`).
- Core API reference: probe contract, report shape, entry points, options,
  custom adapters, helpers, errors, and testing doubles.
- Probe catalog generated from `openstatusHQ/health@dd98e23` with a dependency
  to probe mapping table, runtime compatibility, and criticality defaults.
- Probe lifecycle reference: inventory, bootstrap, audit, boolean-route
  migration, new-dependency handling, and the opt-in coverage check.
- Operations reference: status contract, monitoring, liveness/readiness,
  caching, hardening, and incident response.
- `references/manifest.json` with the verified version and the upstream commit.
- `scripts/sync-probes.mjs` to refresh the generated catalog, with `--check`.
- `scripts/check-freshness.mjs` to compare the manifest with live npm, GitHub
  releases, and docs, with `--check`.
- `assets/check-health-coverage.mjs`, copied into a project only when the user
  asks for drift protection.
- 15 evals covering framework setups, degraded alerting, public hardening,
  liveness/readiness, probe bootstrap and audit, coverage, custom probes, and
  stale framework majors.

### Notes

- Framework drift is manual. Run `check-freshness.mjs --check` before a release.
- Probe catalog drift is manual. Run `sync-probes.mjs` after an upstream
  release.
- No executable framework fixtures. Add them when a framework major actually
  breaks a documented pattern.

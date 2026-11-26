#!/usr/bin/env node
// Optional drift guard for a project that uses @openstatus/health.
//
//   node scripts/check-health-coverage.mjs
//   node scripts/check-health-coverage.mjs --registry src/health/probes.ts
//   node scripts/check-health-coverage.mjs --strict   fail on non-critical gaps too
//   node scripts/check-health-coverage.mjs --json
//   node scripts/check-health-coverage.mjs --include-dev
//
// Plain Node >= 22, no dependencies. Copy it into the target project only when
// the user asks for drift protection. It compares package.json dependencies
// with the imports in the probe registry.
//
// Exit codes: 0 ok, 1 missing probe, 2 usage or config error.

import { readFile, access } from "node:fs/promises";
import path from "node:path";

const DEPENDENCY_MAP = {
  "@prisma/client": { pkg: "@openstatus/health-prisma", factory: "prismaProbe", critical: true },
  prisma: { pkg: "@openstatus/health-prisma", factory: "prismaProbe", critical: true },
  "drizzle-orm": { pkg: "@openstatus/health-drizzle", factory: "drizzleProbe", critical: true },
  pg: { pkg: "@openstatus/health-postgres", factory: "postgresProbe", critical: true },
  postgres: { pkg: "@openstatus/health-postgres", factory: "postgresProbe", critical: true },
  "@neondatabase/serverless": { pkg: "@openstatus/health-neon", factory: "neonProbe", critical: true },
  mysql2: { pkg: "@openstatus/health-mysql", factory: "mysqlProbe", critical: true },
  mongodb: { pkg: "@openstatus/health-mongodb", factory: "mongodbProbe", critical: true },
  "@libsql/client": { pkg: "@openstatus/health-turso", factory: "tursoProbe", critical: true },
  "@tursodatabase/serverless": { pkg: "@openstatus/health-turso-serverless", factory: "tursoServerlessProbe", critical: true },
  "@planetscale/database": { pkg: "@openstatus/health-planetscale", factory: "planetscaleProbe", critical: true },
  "@clickhouse/client": { pkg: "@openstatus/health-clickhouse", factory: "clickhouseProbe", critical: true },
  convex: { pkg: "@openstatus/health-convex", factory: "convexProbe", critical: true },
  "@supabase/supabase-js": { pkg: "@openstatus/health-supabase", factory: "supabaseProbe", critical: false },
  "@tinybirdco/sdk": { pkg: "@openstatus/health-tinybird", factory: "tinybirdProbe", critical: false },
  redis: { pkg: "@openstatus/health-redis", factory: "redisProbe", critical: false },
  ioredis: { pkg: "@openstatus/health-redis", factory: "redisProbe", critical: false },
  "@upstash/redis": { pkg: "@openstatus/health-upstash", factory: "upstashProbe", critical: false },
  "@aws-sdk/client-s3": { pkg: "@openstatus/health-s3", factory: "s3Probe", critical: false },
  bullmq: { pkg: "@openstatus/health-bullmq", factory: "bullmqProbe", critical: false },
  inngest: { pkg: "@openstatus/health-inngest", factory: "inngestProbe", critical: false },
  "@upstash/qstash": { pkg: "@openstatus/health-qstash", factory: "qstashProbe", critical: false },
  "@trigger.dev/sdk": { pkg: "@openstatus/health-trigger-dev", factory: "triggerDevProbe", critical: false },
  kafkajs: { pkg: "@openstatus/health-kafka", factory: "kafkaProbe", critical: false },
  nats: { pkg: "@openstatus/health-nats", factory: "natsProbe", critical: false },
  "@nats-io/transport-node": { pkg: "@openstatus/health-nats", factory: "natsProbe", critical: false },
  algoliasearch: { pkg: "@openstatus/health-algolia", factory: "algoliaProbe", critical: false },
  meilisearch: { pkg: "@openstatus/health-meilisearch", factory: "meilisearchProbe", critical: false },
  typesense: { pkg: "@openstatus/health-typesense", factory: "typesenseProbe", critical: false },
  "@anthropic-ai/sdk": { pkg: "@openstatus/health-anthropic", factory: "anthropicProbe", critical: false },
  openai: { pkg: "@openstatus/health-openai", factory: "openaiProbe", critical: false },
  "@clerk/backend": { pkg: "@openstatus/health-clerk", factory: "clerkProbe", critical: false },
  "posthog-node": { pkg: "@openstatus/health-posthog", factory: "posthogProbe", critical: false },
  "posthog-js": { pkg: "@openstatus/health-posthog", factory: "posthogProbe", critical: false },
  resend: { pkg: "@openstatus/health-resend", factory: "resendProbe", critical: false },
  "@sentry/node": { pkg: "@openstatus/health-sentry", factory: "sentryProbe", critical: false },
  "@sentry/nextjs": { pkg: "@openstatus/health-sentry", factory: "sentryProbe", critical: false },
  stripe: { pkg: "@openstatus/health-stripe", factory: "stripeProbe", critical: false },
  "@unkey/api": { pkg: "@openstatus/health-unkey", factory: "unkeyProbe", critical: false },
  "@workos-inc/node": { pkg: "@openstatus/health-workos", factory: "workosProbe", critical: false },
  "@grpc/grpc-js": { pkg: "@openstatus/health-grpc", factory: "grpcProbe", critical: false },
};

const REGISTRY_CANDIDATES = [
  "src/health/probes.ts",
  "src/health/probes.js",
  "src/health/probes.mts",
  "lib/health/probes.ts",
  "lib/health/probes.js",
  "health/probes.ts",
  "health/probes.js",
  "server/health/probes.ts",
  "server/health/probes.js",
  "app/health/probes.ts",
  "src/health/index.ts",
];

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    registry: null,
    strict: false,
    json: false,
    includeDev: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--include-dev") options.includeDev = true;
    else if (arg === "--root") options.root = argv[++index] ?? options.root;
    else if (arg === "--registry") options.registry = argv[++index] ?? null;
    else if (arg.startsWith("--root=")) options.root = arg.slice("--root=".length);
    else if (arg.startsWith("--registry=")) options.registry = arg.slice("--registry=".length);
    else {
      console.error(`check-health-coverage: unknown argument ${arg}`);
      process.exit(2);
    }
  }

  options.root = path.resolve(options.root);
  return options;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findRegistry(root, explicit) {
  if (explicit) {
    const file = path.resolve(root, explicit);
    return (await exists(file)) ? file : null;
  }
  for (const candidate of REGISTRY_CANDIDATES) {
    const file = path.join(root, candidate);
    if (await exists(file)) return file;
  }
  return null;
}

function usage() {
  console.log(`check-health-coverage

  --root <dir>        project root (default: cwd)
  --registry <file>   probe registry, relative to root (default: auto-detect)
  --strict            fail on missing non-critical probes too
  --include-dev       scan devDependencies as well
  --json              machine-readable output
  --help              this message

Exit codes: 0 ok, 1 missing probe, 2 usage or config error.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const packagePath = path.join(options.root, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(await readFile(packagePath, "utf8"));
  } catch (error) {
    console.error(`check-health-coverage: cannot read ${packagePath} (${error.message})`);
    process.exit(2);
  }

  const dependencyNames = new Set(Object.keys(pkg.dependencies ?? {}));
  if (options.includeDev) {
    for (const name of Object.keys(pkg.devDependencies ?? {})) {
      dependencyNames.add(name);
    }
  }

  const registryFile = await findRegistry(options.root, options.registry);
  const registryText = registryFile ? await readFile(registryFile, "utf8") : "";

  const matches = [];
  for (const dependency of dependencyNames) {
    const mapping = DEPENDENCY_MAP[dependency];
    if (!mapping) continue;

    const hasImport =
      registryText.includes(`"${mapping.pkg}"`) ||
      registryText.includes(`'${mapping.pkg}'`);
    const hasFactory = registryText.includes(mapping.factory);

    matches.push({
      dependency,
      package: mapping.pkg,
      factory: mapping.factory,
      critical: mapping.critical,
      covered: hasImport || hasFactory,
    });
  }

  const missing = matches.filter((entry) => !entry.covered);
  const failing = missing.filter((entry) => entry.critical);
  const warnings = missing.filter((entry) => !entry.critical);

  const report = {
    root: options.root,
    registry: registryFile,
    scanned: dependencyNames.size,
    matched: matches.length,
    covered: matches.length - missing.length,
    missing,
    ok: failing.length === 0 && (!options.strict || warnings.length === 0),
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (matches.length === 0) {
      console.log("No probe-able dependencies found. Nothing to check.");
    } else {
      console.log(`Registry: ${registryFile ?? "not found"}`);
      console.log(
        `Coverage: ${report.covered}/${report.matched} probe-able dependencies`,
      );
      for (const entry of matches) {
        const mark = entry.covered ? "ok  " : entry.critical ? "FAIL" : "warn";
        console.log(
          `  ${mark} ${entry.dependency} -> ${entry.package} (${entry.factory})${
            entry.covered ? "" : "  no probe in registry"
          }`,
        );
      }
      if (registryFile === null) {
        console.log(
          "No registry file found. Create one at src/health/probes.ts, or pass --registry.",
        );
      }
    }
    if (failing.length > 0) {
      console.log("");
      console.log("Add a probe for each critical dependency above.");
    }
    if (warnings.length > 0 && !options.strict) {
      console.log("");
      console.log("Non-critical gaps are warnings. Use --strict to fail on them.");
    }
  }

  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(`check-health-coverage: ${error.message}`);
  process.exit(2);
});

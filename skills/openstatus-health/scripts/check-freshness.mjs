#!/usr/bin/env node
// Compare the versions in references/manifest.json with live npm, GitHub and
// docs. Plain Node >= 22, no dependencies.
//
//   node scripts/check-freshness.mjs           report drift
//   node scripts/check-freshness.mjs --check   exit 1 on breaking drift
//
// Breaking drift for --check:
//   - a tracked package has a newer major than the verified major
//   - the upstream health commit differs from the recorded commit
//   - a documented URL answers 404 or 410, or cannot be reached
//
// Minor and patch drift is reported but does not fail the check.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(here, "..", "references", "manifest.json");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

const TIMEOUT_MS = 15_000;
const USER_AGENT = "openstatus-skills-check-freshness";

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function semver(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    text: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

function majorOf(value) {
  if (value === undefined || value === null) return null;
  const parsed = semver(String(value));
  if (parsed) return parsed.major;
  const numeric = Number(String(value).replace(/^v/, "").split(".")[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

async function npmLatest(pkg) {
  const encoded = pkg.startsWith("@")
    ? `@${encodeURIComponent(pkg.slice(1))}`
    : encodeURIComponent(pkg);
  const response = await request(`https://registry.npmjs.org/${encoded}/latest`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`npm ${response.status}`);
  const body = await response.json();
  return body.version;
}

async function githubLatest(feed) {
  const response = await request(feed, {
    headers: { accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`github ${response.status}`);
  const body = await response.json();
  return {
    tag: body.tag_name ?? body.name ?? null,
    sha: body.sha ?? null,
  };
}

async function docsStatus(url) {
  try {
    let response = await request(url, { method: "HEAD", redirect: "follow" });
    if (response.status === 405 || response.status === 403) {
      response = await request(url, { method: "GET", redirect: "follow" });
    }
    return response.status;
  } catch (error) {
    return error.name === "AbortError" ? "timeout" : "unreachable";
  }
}

function isDeadDocs(status) {
  return status === 404 || status === 410 || status === "unreachable" || status === "timeout";
}

function pad(value, width) {
  return String(value ?? "-").padEnd(width, " ");
}

async function inspect(name, source) {
  const row = {
    name,
    verified: source.verified ?? source.commit?.slice(0, 7) ?? "-",
    latest: "-",
    docs: "-",
    verdict: "ok",
    detail: "",
    breaking: false,
  };

  const tasks = [];

  if (source.npm) {
    tasks.push(
      npmLatest(source.npm)
        .then((version) => {
          row.latest = version;
          const latestMajor = majorOf(version);
          const verifiedMajor =
            source.verifiedMajor ?? majorOf(source.verified);
          if (verifiedMajor === null || latestMajor === null) return;
          if (latestMajor > verifiedMajor) {
            if (source.allowNewerMajor) {
              row.verdict = "major";
              row.detail = `newer major ${latestMajor} (allowed)`;
            } else {
              row.verdict = "MAJOR";
              row.detail = `review ${source.reference ?? name}`;
              row.breaking = true;
            }
          } else if (latestMajor < verifiedMajor) {
            row.verdict = "ahead";
            row.detail = "manifest is newer than npm";
          }
        })
        .catch((error) => {
          row.verdict = "WARN";
          row.detail = `npm: ${error.message}`;
        }),
    );
  }

  if (source.releaseFeed) {
    tasks.push(
      githubLatest(source.releaseFeed)
        .then(({ tag, sha }) => {
          if (source.trackCommit) {
            row.latest = sha ? sha.slice(0, 7) : tag ?? "-";
            if (sha && source.commit && sha !== source.commit) {
              row.verdict = "CATALOG";
              row.detail = "run sync-probes.mjs";
              row.breaking = true;
            }
            return;
          }
          if (!tag) return;
          const parsed = semver(tag);
          if (parsed && row.latest === "-") row.latest = parsed.text;
        })
        .catch((error) => {
          if (row.verdict === "ok") {
            row.verdict = "WARN";
            row.detail = `releases: ${error.message}`;
          }
        }),
    );
  }

  if (source.docs) {
    tasks.push(
      docsStatus(source.docs).then((status) => {
        row.docs = status;
        if (isDeadDocs(status)) {
          row.verdict = "DOCS";
          row.detail = "documented URL is dead";
          row.breaking = true;
        }
      }),
    );
  }

  await Promise.all(tasks);
  return row;
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    console.error(`check-freshness: cannot read manifest (${error.message})`);
    process.exit(1);
  }

  const entries = Object.entries(manifest.sources ?? {});
  if (entries.length === 0) {
    console.error("check-freshness: manifest has no sources");
    process.exit(1);
  }

  const rows = await Promise.all(
    entries.map(([name, source]) =>
      inspect(name, source).catch((error) => ({
        name,
        verified: source.verified ?? "-",
        latest: "-",
        docs: "-",
        verdict: "WARN",
        detail: error.message,
        breaking: false,
      })),
    ),
  );

  const nameWidth = Math.max(8, ...rows.map((row) => row.name.length));
  const verifiedWidth = Math.max(8, ...rows.map((row) => String(row.verified).length));

  console.log(
    `${pad("source", nameWidth)}  ${pad("verified", verifiedWidth)}  ${pad("latest", 10)}  ${pad("docs", 6)}  result`,
  );

  for (const row of rows) {
    const detail = row.detail ? ` - ${row.detail}` : "";
    console.log(
      `${pad(row.name, nameWidth)}  ${pad(row.verified, verifiedWidth)}  ${pad(row.latest, 10)}  ${pad(row.docs, 6)}  ${row.verdict}${detail}`,
    );
  }

  const breaking = rows.filter((row) => row.breaking);
  const warnings = rows.filter((row) => !row.breaking && row.verdict !== "ok");

  console.log("");
  console.log(`checked: ${manifest.checkedAt ?? "unknown"}`);

  if (breaking.length > 0) {
    console.log(`breaking drift: ${breaking.map((row) => row.name).join(", ")}`);
    console.log("Next: read the release notes, update the reference, bump the skill version.");
    if (checkOnly) process.exit(1);
    return;
  }

  if (warnings.length > 0) {
    console.log(`warnings: ${warnings.map((row) => row.name).join(", ")}`);
  } else {
    console.log("all references current");
  }
}

main().catch((error) => {
  console.error(`check-freshness: ${error.message}`);
  process.exit(1);
});

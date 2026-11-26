#!/usr/bin/env node
// Refresh the generated probe catalog in references/probes.md from the upstream
// openstatusHQ/health README. Plain Node >= 22, no dependencies.
//
//   node scripts/sync-probes.mjs           rewrite the catalog and manifest
//   node scripts/sync-probes.mjs --check   exit 1 when upstream has drifted
//
// The generated block is delimited by:
//   <!-- BEGIN GENERATED: probe-catalog -->
//   <!-- END GENERATED: probe-catalog -->

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const README_URL =
  "https://raw.githubusercontent.com/openstatusHQ/health/main/README.md";
const COMMIT_API =
  "https://api.github.com/repos/openstatusHQ/health/commits/main";

const BEGIN = "<!-- BEGIN GENERATED: probe-catalog -->";
const END = "<!-- END GENERATED: probe-catalog -->";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, "..");
const probesPath = path.join(skillDir, "references", "probes.md");
const manifestPath = path.join(skillDir, "references", "manifest.json");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

function fail(message) {
  console.error(`sync-probes: ${message}`);
  process.exit(1);
}

async function getText(url, accept) {
  const response = await fetch(url, {
    headers: {
      accept: accept ?? "text/plain",
      "user-agent": "openstatus-skills-sync-probes",
    },
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.text();
}

function sliceBetween(source, startHeading, endHeading) {
  const start = source.indexOf(`\n${startHeading}\n`);
  if (start === -1) throw new Error(`missing heading: ${startHeading}`);
  const from = start + 1;
  const end = source.indexOf(`\n${endHeading}\n`, from);
  if (end === -1) throw new Error(`missing heading: ${endHeading}`);
  return source.slice(from, end).trim();
}

// Drop a column from a markdown table. `column` is the zero-based index of the
// cell to remove, where the split result's index 0 is the text before the
// leading pipe.
function dropTableColumn(block, column) {
  return block
    .split("\n")
    .map((line) => {
      if (!line.trimStart().startsWith("|")) return line;
      const cells = line.split("|");
      if (cells.length <= column) return line;
      cells.splice(column, 1);
      return cells.join("|");
    })
    .join("\n");
}

// Replace [`pkg`](packages/x) with `pkg` so upstream-relative links do not
// become dead links in this repo.
function unlinkPackages(block) {
  return block.replace(/\[`([^`]+)`\]\([^)]*\)/g, "`$1`");
}

function indentAsSubsections(block) {
  // The upstream probe catalog uses ### subsections inside ## Probes. Demote
  // every heading by one level so the block nests under `### Probe packages`.
  return block.replace(/^(#{3,6}) /gm, "#$1 ");
}

function buildAdapters(readme) {
  const section = sliceBetween(readme, "### Server adapters", "### Probes");
  const headerEnd = section.indexOf("\n\n");
  const table = headerEnd === -1 ? section : section.slice(headerEnd).trim();
  return dropTableColumn(unlinkPackages(table), 2);
}

function buildProbeCatalog(readme) {
  const section = sliceBetween(readme, "## Probes", "### Writing your own probe");
  // Drop the leading `## Probes` heading; the generated block already sits
  // under `## Generated Catalog` and `### Probe packages`.
  const body = section.replace(/^## Probes\n+/, "");
  return unlinkPackages(indentAsSubsections(body));
}

function buildBlock(commit, readme, syncedAt) {
  const adapters = buildAdapters(readme);
  const catalog = buildProbeCatalog(readme);

  return [
    BEGIN,
    `<!-- upstream: openstatusHQ/health@${commit} synced: ${syncedAt} -->`,
    "### Server adapters",
    "",
    adapters,
    "",
    "### Probe packages",
    "",
    "Every factory also takes `name`, `critical`, `timeoutMs` and `skip`.",
    "",
    catalog,
    END,
  ].join("\n");
}

function replaceBlock(fileText, block) {
  const start = fileText.indexOf(BEGIN);
  const end = fileText.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      "references/probes.md is missing the generated block markers",
    );
  }
  return fileText.slice(0, start) + block + fileText.slice(end + END.length);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  let commit;
  let readme;
  try {
    const [commitText, readmeText] = await Promise.all([
      getText(COMMIT_API, "application/vnd.github+json"),
      getText(README_URL),
    ]);
    commit = JSON.parse(commitText).sha;
    readme = readmeText;
  } catch (error) {
    fail(
      `could not reach upstream (${error.message}). Keep the bundled snapshot and retry later.`,
    );
  }

  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail(`unexpected commit sha from upstream: ${commit}`);
  }

  const probesText = await readFile(probesPath, "utf8");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const recorded = manifest.sources?.health?.commit;

  if (checkOnly) {
    const block = buildBlock(commit, readme, today());
    const current = probesText.slice(
      probesText.indexOf(BEGIN),
      probesText.indexOf(END) + END.length,
    );
    const currentNormalized = current.replace(
      /<!-- upstream: openstatusHQ\/health@[0-9a-f]{40} synced: \d{4}-\d{2}-\d{2} -->/,
      "",
    );
    const freshNormalized = block.replace(
      /<!-- upstream: openstatusHQ\/health@[0-9a-f]{40} synced: \d{4}-\d{2}-\d{2} -->/,
      "",
    );

    if (commit !== recorded) {
      console.error(
        `catalog drift: manifest records ${recorded}, upstream is ${commit}`,
      );
      process.exit(1);
    }
    if (currentNormalized !== freshNormalized) {
      console.error(
        "catalog drift: references/probes.md differs from the upstream README",
      );
      process.exit(1);
    }
    console.log(`catalog current: openstatusHQ/health@${commit}`);
    return;
  }

  const block = buildBlock(commit, readme, today());
  const nextProbes = replaceBlock(probesText, block);
  await writeFile(probesPath, nextProbes, "utf8");

  if (manifest.sources?.health) {
    manifest.sources.health.commit = commit;
    manifest.sources.health.checkedAt = today();
    manifest.checkedAt = today();
    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  }

  if (recorded === commit) {
    console.log(`catalog unchanged: openstatusHQ/health@${commit}`);
  } else {
    console.log(
      `catalog updated: ${recorded ?? "unknown"} -> openstatusHQ/health@${commit}`,
    );
  }
  console.log("Files: references/probes.md, references/manifest.json");
  console.log("Bump the skill patch version in SKILL.md and add a CHANGELOG entry.");
}

main().catch((error) => fail(error.message));

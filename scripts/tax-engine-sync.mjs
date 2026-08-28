#!/usr/bin/env node
/**
 * Keep this app's tax engine byte-identical to paychecklink.com.
 *
 *   node scripts/tax-engine-sync.mjs check  # fail if files differ (CI)
 *   node scripts/tax-engine-sync.mjs sync   # copy from website + write lockfile
 *
 * Do not add comments to copied files — that would make them differ forever.
 * Timestamp / source commit live in tax-engine.lock.json instead.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE_REPO = "https://github.com/dansoltechcompany/paychecklink.git";
const LOCK_FILE = join(ROOT, "tax-engine.lock.json");

const FILES = [
  "lib/calculator.ts",
  "lib/types.ts",
  "lib/tax/ca-credits.ts",
  "lib/tax/ca-sdi.ts",
  "lib/tax/canada.ts",
  "lib/tax/federal-withholding.ts",
  "lib/tax/federal.ts",
  "lib/tax/fica.ts",
  "lib/tax/international.ts",
  "lib/tax/local.ts",
  "lib/tax/md-local.ts",
  "lib/tax/nyc-local.ts",
  "lib/tax/state.ts",
  "lib/tax/uk.ts",
];

function resolveSource() {
  const candidates = [
    process.env.TAX_ENGINE_SOURCE,
    join(ROOT, ".website-engine"),
    join(ROOT, "..", "Salary Paycheck Calculator"),
    join(ROOT, "..", "paychecklink"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (existsSync(join(dir, "lib", "calculator.ts"))) return dir;
  }
  return null;
}

function normalize(buf) {
  return Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
}

function readNormalized(path) {
  return normalize(readFileSync(path));
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function git(source, args) {
  try {
    return execFileSync("git", args, { cwd: source, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function extraTaxFiles(source) {
  const taxDir = join(source, "lib", "tax");
  if (!existsSync(taxDir)) return [];
  const expected = new Set(
    FILES.filter((f) => f.startsWith("lib/tax/")).map((f) =>
      f.slice("lib/tax/".length)
    )
  );
  return readdirSync(taxDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .filter((name) => !expected.has(name));
}

function compare() {
  const source = resolveSource();
  if (!source) {
    return {
      source: null,
      diffs: [
        "Tax engine source not found. Set TAX_ENGINE_SOURCE to the website repo, or keep it at ../Salary Paycheck Calculator.",
      ],
      websiteCommit: null,
      websiteShort: null,
    };
  }

  const diffs = [];
  for (const file of FILES) {
    const from = join(source, file);
    const to = join(ROOT, file);
    if (!existsSync(from)) {
      diffs.push(`${file}: missing in website repo`);
      continue;
    }
    if (!existsSync(to)) {
      diffs.push(`${file}: missing in mobile app`);
      continue;
    }
    if (!readNormalized(from).equals(readNormalized(to))) {
      diffs.push(`${file}: differs from website`);
    }
  }

  for (const name of extraTaxFiles(source)) {
    diffs.push(
      `lib/tax/${name}: on website but not in scripts/tax-engine-sync.mjs FILES`
    );
  }

  return {
    source,
    diffs,
    websiteCommit: git(source, ["rev-parse", "HEAD"]),
    websiteShort: git(source, ["rev-parse", "--short", "HEAD"]),
  };
}

function check() {
  const { diffs, websiteCommit, websiteShort, source } = compare();
  if (diffs.length) {
    console.error("Tax engine drift detected (mobile lib/ vs paychecklink.com):\n");
    for (const d of diffs) console.error(`  - ${d}`);
    if (websiteCommit) console.error(`\nWebsite commit: ${websiteCommit}`);
    console.error("\nFix: npm run tax:sync\n");
    process.exit(1);
  }

  console.log(
    `Tax engine matches website (${websiteShort ?? source}). ${FILES.length} files OK.`
  );
}

function sync() {
  const source = resolveSource();
  if (!source) {
    console.error(
      "Tax engine source not found. Set TAX_ENGINE_SOURCE or keep the website at ../Salary Paycheck Calculator."
    );
    process.exit(1);
  }

  const hashes = {};
  for (const file of FILES) {
    const from = join(source, file);
    const to = join(ROOT, file);
    if (!existsSync(from)) {
      console.error(`Missing on website: ${file}`);
      process.exit(1);
    }
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    hashes[file] = sha256(readNormalized(from));
  }

  const extra = extraTaxFiles(source);
  if (extra.length) {
    console.error("Website has tax files not in the sync list:");
    for (const name of extra) console.error(`  - lib/tax/${name}`);
    console.error("Add them to scripts/tax-engine-sync.mjs FILES.");
    process.exit(1);
  }

  const sourceCommit = git(source, ["rev-parse", "HEAD"]);
  const lock = {
    sourceRepo: SOURCE_REPO,
    sourceCommit,
    syncedAt: new Date().toISOString(),
    files: hashes,
  };
  writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(
    `Copied ${FILES.length} files from website ${sourceCommit ?? source}.`
  );
  console.log(`Wrote ${relative(ROOT, LOCK_FILE)}.`);
}

const cmd = process.argv[2] ?? "check";
if (cmd === "check") {
  check();
} else if (cmd === "sync") {
  sync();
  check();
} else {
  console.error("Usage: node scripts/tax-engine-sync.mjs [check|sync]");
  process.exit(1);
}

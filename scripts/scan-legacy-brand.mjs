#!/usr/bin/env node
/**
 * Global brand scan — detects leftover "Jetra" / "Getra" references
 * across the entire codebase (excluding node_modules, dist, build, .git).
 *
 * Usage:
 *   node scripts/scan-legacy-brand.mjs
 *   npm run scan:brand
 *
 * Exit codes:
 *   0 — no matches found
 *   1 — legacy brand strings detected (CI-friendly)
 */
import { spawnSync } from "node:child_process";

const PATTERN = "jetra|getra";
const EXCLUDES = [
  "!node_modules",
  "!dist",
  "!build",
  "!.git",
  "!.next",
  "!coverage",
  "!*.lock",
  "!bun.lockb",
  "!package-lock.json",
  "!scripts/scan-legacy-brand.mjs", // self
];

// Words that contain the substrings but are NOT brand mentions.
const FALSE_POSITIVE_REGEX =
  /getRandomValues|getRateStore|getRate\b|getRect|getRange/i;

const args = ["-in", "--color=never", PATTERN];
for (const e of EXCLUDES) args.push("-g", e);
args.push(".");

const res = spawnSync("rg", args, { encoding: "utf8" });

if (res.status !== 0 && res.status !== 1) {
  console.error("ripgrep failed:", res.stderr || res.error);
  process.exit(2);
}

const lines = (res.stdout || "")
  .split("\n")
  .filter(Boolean)
  .filter((l) => !FALSE_POSITIVE_REGEX.test(l));

if (lines.length === 0) {
  console.log("✅ No legacy brand references (Jetra/Getra) found.");
  process.exit(0);
}

console.log(`❌ Found ${lines.length} legacy brand reference(s):\n`);
for (const l of lines) console.log("  " + l);
console.log("\nReplace these with 'Techvinex' before shipping.");
process.exit(1);

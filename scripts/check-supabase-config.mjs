#!/usr/bin/env node
// Guard: fail CI if supabase/config.toml points at Lovable Cloud
// (project_id = "xfgyzcvrvgsntjenxecp") or is missing project_id.
// This catches Lovable Cloud silently rewriting config.toml back to the old ref.
import { readFileSync } from "node:fs";

const LOVABLE_CLOUD_REF = "xfgyzcvrvgsntjenxecp";
const CONFIG_PATH = "supabase/config.toml";

let contents;
try {
  contents = readFileSync(CONFIG_PATH, "utf8");
} catch (err) {
  console.error(`[guard] cannot read ${CONFIG_PATH}: ${err.message}`);
  process.exit(1);
}

const match = contents.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
if (!match) {
  console.error(`[guard] ${CONFIG_PATH} has no project_id line.`);
  process.exit(1);
}

const ref = match[1];
if (ref === LOVABLE_CLOUD_REF) {
  console.error(
    `[guard] ${CONFIG_PATH} project_id="${ref}" points at Lovable Cloud.`,
  );
  console.error(
    `[guard] Production runs on the external Supabase project. If Lovable regenerated this file, revert before merging.`,
  );
  process.exit(1);
}

console.log(`[guard] ${CONFIG_PATH} project_id="${ref}" — OK.`);

#!/usr/bin/env node
/**
 * Regenerate ONE carousel after a manual QC fix.
 *
 * Use this when you have downloaded a finished carousel, looked at it, and a
 * slide is wrong — bad image, garbled text, or copy that needs editing.
 *
 * Flow:
 *   1. (optional) edit plan.json — fix the HEADLINE / BODY text in a slide's
 *      "brief". This is how you correct wording.
 *   2. run regen.js — it re-renders EVERY slide from plan.json, finalises,
 *      and re-uploads to GCS, overwriting the old folder.
 *
 * Usage:
 *   node regen.js <content-id>            download from GCS, regen, re-upload
 *   node regen.js <path/to/carousel-dir>  use a local folder (must hold plan.json)
 * Options:
 *   --account <email>   pin a codex account from the pool
 *   --bucket <name>     GCS bucket (default: $GCS_BUCKET or ibils-carousel-content)
 *
 * Needs $GCS_KEY pointing at the service-account key (same as the burst).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const TARGET = process.argv[2];
if (!TARGET || TARGET.startsWith("--")) {
  console.error(
    "usage: node regen.js <content-id | carousel-dir> [--account <email>] [--bucket <name>]"
  );
  process.exit(1);
}
const ACCOUNT = arg("--account", "");
const BUCKET = arg("--bucket", process.env.GCS_BUCKET || "ibils-carousel-content");

async function isDir(p) {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

// run a sibling skill script, streaming its output
function run(file, args) {
  return new Promise((resolve, reject) => {
    const c = spawn("node", [path.join(HERE, file), ...args], {
      stdio: "inherit",
      env: process.env
    });
    c.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`))
    );
    c.on("error", reject);
  });
}

async function main() {
  let dir;
  let contentId;
  if (await isDir(TARGET)) {
    dir = path.resolve(TARGET);
    contentId = path.basename(dir.replace(/\/+$/, ""));
  } else {
    // a GCS content-id — download the folder first
    contentId = TARGET.replace(/\/+$/, "");
    dir = path.join(os.tmpdir(), `regen-${contentId}`);
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(path.join(dir, "slides"), { recursive: true });
    console.log(`downloading gs://${BUCKET}/${contentId} ...`);
    await execFileP("gsutil", [
      "-m", "cp", "-r", `gs://${BUCKET}/${contentId}/*`, dir
    ], { env: process.env });
  }

  const planPath = path.join(dir, "plan.json");
  try {
    await fs.access(planPath);
  } catch {
    console.error(`no plan.json found in ${dir}`);
    process.exit(1);
  }

  // wipe the slides — every slide re-renders from plan.json (which you may
  // have just edited to fix the copy)
  const slidesDir = path.join(dir, "slides");
  await fs.rm(slidesDir, { recursive: true, force: true });
  await fs.mkdir(slidesDir, { recursive: true });

  const genArgs = [planPath, slidesDir];
  if (ACCOUNT) genArgs.push("--account", ACCOUNT);
  console.log("regenerating slides ...");
  await run("gen-carousel.js", genArgs);
  console.log("finalising ...");
  await run("finalize.js", [slidesDir]);
  console.log(`uploading to gs://${BUCKET}/${contentId} ...`);
  await run("gcs-upload.js", [dir, contentId]);
  console.log(`\nDONE — regenerated gs://${BUCKET}/${contentId}/`);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});

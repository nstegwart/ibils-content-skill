#!/usr/bin/env node
/**
 * Upload one finished carousel to Google Drive via rclone.
 *
 * Mirrors the GCS layout — one folder per carousel inside the configured
 * Drive folder (the rclone `gdrive` remote, whose root_folder_id points at it):
 *   <content-id>/plan.json
 *   <content-id>/slides/01-cover.png ... NN-closing.png
 * plan.json travels with the slides so any carousel can be regenerated later.
 *
 * Auth: an rclone remote that OAuths to the user's own Google account —
 * a service account cannot write to a personal Drive folder (no quota). Set up
 * once with:
 *   rclone config create gdrive drive scope=drive root_folder_id=<folder-id>
 *
 * Env:
 *   RCLONE_BIN     rclone executable (default: rclone)
 *   DRIVE_REMOTE   rclone remote name (default: gdrive)
 *
 * Usage: node drive-upload.js <carousel-dir> <content-id>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const RCLONE = process.env.RCLONE_BIN || "rclone";
const REMOTE = process.env.DRIVE_REMOTE || "gdrive";

const DIR = process.argv[2];
const CONTENT_ID = process.argv[3];
if (!DIR || !CONTENT_ID) {
  console.error("usage: node drive-upload.js <carousel-dir> <content-id>");
  process.exit(1);
}

async function main() {
  const plan = path.join(DIR, "plan.json");
  const slides = path.join(DIR, "slides");
  try {
    await fs.access(plan);
    await fs.access(slides);
  } catch {
    console.error(`carousel-dir must contain plan.json and slides/: ${DIR}`);
    process.exit(1);
  }
  const dest = `${REMOTE}:${CONTENT_ID}`;
  await execFileP(RCLONE, ["copyto", plan, `${dest}/plan.json`], { env: process.env });
  await execFileP(RCLONE, ["copy", slides, `${dest}/slides`], { env: process.env });
  console.log(`uploaded -> Drive ${dest}/`);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});

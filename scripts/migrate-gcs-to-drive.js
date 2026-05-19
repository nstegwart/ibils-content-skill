#!/usr/bin/env node
/**
 * ONE-TIME migration: copy every carousel from GCS bucket(s) into Google Drive.
 *
 * For each <content-id> folder in each bucket: download with gsutil, push to
 * the Drive `gdrive` remote with rclone, drop the temp copy. Idempotent —
 * carousels already present in Drive are skipped, so it is safe to re-run.
 *
 * Usage: node migrate-gcs-to-drive.js <bucket> [<bucket> ...]
 * Env:
 *   GCS_KEY        GCS service-account key (download side)
 *   RCLONE_BIN     rclone executable (default: rclone)
 *   DRIVE_REMOTE   rclone remote name (default: gdrive)
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const RCLONE = process.env.RCLONE_BIN || "rclone";
const REMOTE = process.env.DRIVE_REMOTE || "gdrive";
const KEY = process.env.GCS_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;

const buckets = process.argv.slice(2);
if (!buckets.length) {
  console.error("usage: node migrate-gcs-to-drive.js <bucket> [<bucket> ...]");
  process.exit(1);
}
const gsEnv = { ...process.env };
if (KEY) gsEnv.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE = KEY;

async function listFolders(bucket) {
  const { stdout } = await execFileP("gsutil", ["ls", `gs://${bucket}/`], { env: gsEnv });
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith("/"))
    .map((l) => l.replace(/\/+$/, "").split("/").pop());
}

// already in Drive? — keeps the migration resumable / safe to re-run
async function driveHas(id) {
  try {
    const { stdout } = await execFileP(RCLONE, ["lsf", `${REMOTE}:${id}`], {
      env: process.env
    });
    return stdout.includes("plan.json");
  } catch {
    return false;
  }
}

async function migrateOne(bucket, id) {
  const tmp = path.join(os.tmpdir(), `mig-${id}`);
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp, { recursive: true });
  try {
    await execFileP("gsutil", ["-m", "cp", "-r", `gs://${bucket}/${id}/*`, tmp], {
      env: gsEnv
    });
    await execFileP(RCLONE, ["copy", tmp, `${REMOTE}:${id}`], { env: process.env });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

async function main() {
  let done = 0;
  let skip = 0;
  let fail = 0;
  for (const bucket of buckets) {
    const ids = await listFolders(bucket);
    console.log(`${bucket}: ${ids.length} carousels`);
    for (const id of ids) {
      try {
        if (await driveHas(id)) {
          skip++;
          console.log(`skip ${id} (already in Drive)`);
          continue;
        }
        await migrateOne(bucket, id);
        done++;
        console.log(`ok   ${id}  [${done}]`);
      } catch (e) {
        fail++;
        console.error(`FAIL ${id}: ${e.message}`);
      }
    }
  }
  console.log(`migration done — ${done} copied, ${skip} skipped, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Upload one finished carousel to Google Cloud Storage.
 *
 * Each carousel becomes one folder in the bucket:
 *   gs://<bucket>/<content-id>/plan.json
 *   gs://<bucket>/<content-id>/slides/01-cover.png ... NN-closing.png
 * The plan.json travels with the slides so any content can be regenerated or
 * edited later (download the folder, tweak plan.json, re-run gen-carousel).
 *
 * Auth: a GCS service-account key. Path from env GCS_KEY, else
 * GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage: node gcs-upload.js <carousel-dir> <content-id>
 *   <carousel-dir> must contain plan.json and slides/
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const BUCKET = process.env.GCS_BUCKET || "ibils-carousel-content";
const KEY = process.env.GCS_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;

const DIR = process.argv[2];
const CONTENT_ID = process.argv[3];
if (!DIR || !CONTENT_ID) {
  console.error("usage: node gcs-upload.js <carousel-dir> <content-id>");
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

  // gsutil authed as the service account (no global gcloud state touched)
  const env = { ...process.env };
  if (KEY) env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE = KEY;
  const dest = `gs://${BUCKET}/${CONTENT_ID}`;

  await execFileP("gsutil", ["-m", "cp", plan, `${dest}/plan.json`], { env });
  await execFileP("gsutil", ["-m", "cp", "-r", slides, `${dest}/slides`], { env });

  const url = `https://console.cloud.google.com/storage/browser/${BUCKET}/${CONTENT_ID}`;
  console.log(`uploaded -> ${dest}/`);
  console.log(url);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});

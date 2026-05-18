// Codex account pool for the Ibils carousel skill — standalone (no project
// imports). Discovers every codex account on disk, picks usable ones, and
// tracks a shared exhausted-set so a dead / rate-limited account is dropped.
//
// A LIVE-ACCOUNT problem fix: dead accounts (spent refresh token) and
// rate-limited ones are detected from a codex session's own output via
// isAuthDead / isRateLimited, then markExhausted drops them from the pool.
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const CODEX_DIR = process.env.CODEX_POOL_HOME || path.join(os.homedir(), ".codex");
const ACCOUNTS_DIR =
  process.env.CODEX_ACCOUNTS_DIR || path.join(CODEX_DIR, "accounts");
const STATUS_DIR = path.join(CODEX_DIR, "status-cache");
const EXHAUSTED_FILE = path.join(CODEX_DIR, ".ibils-carousel-exhausted.json");
const EXHAUSTED_TTL_MS = 60 * 60 * 1000; // 1h

export const RATE_LIMIT_RE = /usage limit|rate.?limit|try again at/i;
export const AUTH_DEAD_RE = /refresh token|log ?out and sign in|401 unauthorized|token_expired/i;

export function isRateLimited(text) {
  return RATE_LIMIT_RE.test(String(text || ""));
}
export function isAuthDead(text) {
  return AUTH_DEAD_RE.test(String(text || ""));
}

function decodeJwt(jwt) {
  const body = String(jwt || "").split(".")[1];
  if (!body) return {};
  const norm = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm.padEnd(Math.ceil(norm.length / 4) * 4, "=");
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

// Every codex account on disk. openai@vizz accounts are excluded (global rule).
export async function discoverAccounts() {
  let files;
  try {
    files = (await fs.readdir(ACCOUNTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  files.sort();
  const out = [];
  for (const file of files) {
    const accountPath = path.join(ACCOUNTS_DIR, file);
    const auth = await readJson(accountPath);
    if (!auth) continue;
    const payload = decodeJwt(auth?.tokens?.id_token);
    const email =
      payload.email ||
      file.replace(/\.json$/, "").replace(/\.(team|plus|free|api)$/, "");
    if (!email || /^openai@vizz/i.test(email)) continue;
    out.push({ email, accountPath, file });
  }
  return out;
}

async function statusHint(email) {
  for (const n of [`${email}.team.json`, `${email}.plus.json`, `${email}.free.json`]) {
    const s = await readJson(path.join(STATUS_DIR, n));
    if (s) return s;
  }
  return null;
}

async function readExhausted() {
  const raw = (await readJson(EXHAUSTED_FILE)) || {};
  const now = Date.now();
  const live = {};
  for (const [email, resetAt] of Object.entries(raw)) {
    if (typeof resetAt === "number" && resetAt > now) live[email] = resetAt;
  }
  return live;
}

// Drop an account from the pool for a while (rate-limited / auth-dead).
export async function markExhausted(email, ttlMs = EXHAUSTED_TTL_MS) {
  const live = await readExhausted();
  live[email] = Date.now() + ttlMs;
  await fs.writeFile(EXHAUSTED_FILE, `${JSON.stringify(live, null, 2)}\n`, "utf8");
}

// Accounts usable right now — not exhausted, and (when a status hint exists)
// not flagged rate-limited.
export async function listUsableAccounts() {
  const [accounts, exhausted] = await Promise.all([
    discoverAccounts(),
    readExhausted()
  ]);
  const usable = [];
  for (const account of accounts) {
    if (exhausted[account.email]) continue;
    const status = await statusHint(account.email);
    if (status && status.rate_limit_reached_type) continue;
    usable.push(account);
  }
  return usable;
}

// Provision an isolated CODEX_HOME authed as `account`.
export async function provisionCodexHome(homeDir, account) {
  await fs.mkdir(homeDir, { recursive: true });
  const authFile = path.join(homeDir, "auth.json");
  await fs.copyFile(account.accountPath, authFile);
  await fs.chmod(authFile, 0o600);
  return homeDir;
}

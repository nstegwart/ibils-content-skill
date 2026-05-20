#!/usr/bin/env node
/**
 * Copy critic — AI second-pass review of a carousel plan.json.
 *
 * The mechanical linter (lint-plan.js) blocks known banlist phrases. The
 * critic catches dumb / awkward / grammatically off / AI-feeling Indonesian
 * that slipped past the writer — patterns no static banlist can predict.
 *
 * Flow: spawn codex as a savage Indonesian copy editor, feed it the plan,
 * read its verdict, exit 0 (clean) or 1 (FAIL — caller should fixPlan).
 *
 * Usage: node critic-plan.js <plan.json>
 * Exit 0 = clean; 1 = at least one FAIL; 2 = critic itself errored (caller
 * should treat as soft-pass to avoid blocking the carousel forever).
 */
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const PLAN_PATH = process.argv[2];
if (!PLAN_PATH) {
  console.error("usage: node critic-plan.js <plan.json>");
  process.exit(1);
}

const SYSTEM = `Kamu editor copy Bahasa Indonesia. Tugasmu: baca plan carousel IBILS
(JSON), tangkap kalimat tolol GRAVE. Galak ke yang tolol asli, jangan rewel
ke style-nit.

Dua tingkat severity:

== FAIL — GRAVE ONLY (blocking, bikin VERDICT: FAIL) ==
- "muda" attach ke benda: "gaji muda", "skill muda", "kerja muda",
  "pendapatan muda" — gaji ga umur, ga ada orang Indo ngomong gini. Yang
  benar: "gaji anak muda", "gaji pertama", "gaji UMR", "pekerja muda".
  Idiom Indonesia asli buat gaji kecil = "gaji imut" (pakai ini kalau mau
  label colloquial buat gaji UMR/pertama yang mini).
- Hedge: "disebut", "katanya", "kabarnya", "mungkin", "kemungkinan",
  "diperkirakan", "diprediksi", "diramalkan", "diduga", "konon". Forecast
  attribution juga hedge ("BI diperkirakan menaikkan ..."), wajib direct.
- Istilah karangan: "uang dokter" buat dana darurat, dll.
- Empty payoff: "biar tenang", "hidup lebih baik", "rasakan bedanya",
  "lebih bijak", "lebih siap".
- 3+ headline di deck buka kata sama (formula scaffold).
- Body 100% cuma restate headline tanpa info baru.
- Forced wordplay yang sampai BIKIN BINGUNG (bukan sekedar pun lemah).
- Kalimat yang BENAR-BENAR robotik / unreadable.

== WARN — style-nit (NON-blocking, tidak ubah verdict) ==
- Subjek agak aneh tapi masih terbaca ("hematnya bocor").
- Pleonasm minor ("nggak langsung instan").
- Kalimat agak panjang.
- Pilihan kata yang sebenarnya valid tapi bisa lebih tajam.
- Generic "anak muda" walau bisa lebih konkret.

== JANGAN flag ==
- ALL-CAPS hook, kata gaul ("doang", "nggak", "banget", "kalo", "bikin").
- English finance term ("cashflow", "side hustle", "paylater").
- Pilihan stylistic yang valid.
- Hook yang punchy / contrarian / nyentil — itu bukan tolol.

Output format — satu baris per temuan:
FAIL slide <N> (<jenis>): "<kutipan>" — <alasan> — fix: <usul rewrite>
WARN slide <N> (<jenis>): "<kutipan>" — <catatan>

Akhiri output dengan SATU baris terakhir, persis salah satu:
VERDICT: PASS
VERDICT: FAIL

Aturan verdict:
- VERDICT: FAIL HANYA kalau ada >= 1 FAIL grave.
- WARN-only (no FAIL) -> VERDICT: PASS.
- Bersih -> VERDICT: PASS.

Jangan over-flag. Galak HANYA ke tolol asli. Plan yang oke harus lolos.`;

async function main() {
  const plan = await fs.readFile(PLAN_PATH, "utf8");
  const prompt = `${SYSTEM}\n\nPLAN:\n${plan}\n\nReview sekarang.`;
  const args = [
    "exec",
    "-m", "gpt-5.5",
    "-c", 'model_reasoning_effort="medium"',
    "--dangerously-bypass-approvals-and-sandbox",
    "--skip-git-repo-check",
    "-"
  ];
  const child = spawn("codex", args, {
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"]
  });
  let buf = "";
  child.stdout.on("data", (d) => (buf += d.toString()));
  child.stderr.on("data", (d) => (buf += d.toString()));
  child.stdin.end(prompt);
  // 4-minute hard cap — a hung critic must not stall a whole carousel
  const killer = setTimeout(() => child.kill("SIGKILL"), 4 * 60 * 1000);
  const code = await new Promise((resolve) => child.on("close", resolve));
  clearTimeout(killer);

  const lines = buf.split("\n");
  // require a real digit after "FAIL slide " — drops the prompt's template
  // placeholder line ("FAIL slide <N> ..."). Then dedup — codex sometimes
  // echoes its findings twice.
  const fails = [...new Set(
    lines
      .map((l) => l.trim())
      .filter((l) => /^FAIL slide \d+/i.test(l))
  )];
  // verdict is the LAST VERDICT line printed
  let verdict = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/VERDICT:\s*(PASS|FAIL)/i);
    if (m) { verdict = m[1].toUpperCase(); break; }
  }

  for (const f of fails) console.log(f);

  if (code !== 0 && !verdict) {
    // codex itself failed (rate-limit / dead account / timeout).
    // Soft-pass — do not stall the carousel forever; the lint already gated.
    console.log("critic: codex unavailable — soft-pass (lint already gated)");
    process.exit(2);
  }

  if (verdict === "PASS") {
    console.log("critic: clean");
    process.exit(0);
  }
  if (verdict === "FAIL") {
    console.log("critic: FAIL — rewrite the flagged slides");
    process.exit(1);
  }
  // No VERDICT printed at all — be lenient (do not block).
  console.log("critic: no verdict parsed — soft-pass");
  process.exit(2);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(2);
});

#!/usr/bin/env node
/**
 * Quality gate AFTER lint-plan + lint-voice.
 *
 * Lint clean ≠ good script. This scores what writing-research-id.md measured:
 * named-entity density, body length, cover nerve, anti-clone signals.
 *
 *   node lint-quality.js <plan.json> [--min-score 5]
 * Exit 0 = pass. Exit 1 = FAIL (quality).
 *
 * Doctrine: references/writing-research-id.md + ULTIMATE-SCRIPT-GEN.md
 */
import fs from "node:fs/promises";

const PLAN_PATH = process.argv[2];
const minScoreArg = process.argv.indexOf("--min-score");
const MIN_SCORE = minScoreArg >= 0 ? Number(process.argv[minScoreArg + 1]) : 5;

if (!PLAN_PATH) {
  console.error("usage: node lint-quality.js <plan.json> [--min-score 5]");
  process.exit(1);
}

const HEADLINE_RE = /HEADLINE:\s*"([^"]*)"/i;
const BODY_RE = /BODY:\s*"([^"]*)"/is;

const NAMED =
  /\b(OJK|Kredivo|Shopee|Netflix|GoPay|Dana|OVO|ANTARA|Kompas|GoFood|Grab|BI-?FAST|BI Rate|PLN|BPJS|CNBC|detik|SLIK|YouGov|Nielsen|Spotify|GoTo|Gojek|BCA|BRI|Mandiri|Indihome|Akulaku|Atome|FinanceBuzz|Deloitte|CFPB|HBR|SWA|BPS|Kemenag|Kemnaker|Cermati|PDAM|Mobile JKN|Play Store|App Store|tiket\.com|Tiket|Loket|Samsat|Korlantas|Pertamina|Indomaret|Alfamart|DJP|Klikpajak|MUC|UMR|UMP|Disney|YouTube|Premium|SPayLater|PayLater|Klarna|Afterpay|Clearpay|Revolut|Monzo|Wise|FCA|OECD|ETF|BNPL)\b/i;

const BAD_SLANG = /\b(DIEM|KECIK|NYENGAT|THIN)\b/i;
const CMD_OPEN =
  /^(Buka|Tulis|Catat|Set |Open |Bandingkan|Hitung|Screenshot|Download)\b/;
const SRC_FIRST =
  /^(Menurut|Per\b|OJK\b|BPS\b|BI\b|ANTARA|CNBC|Kompas|Detik|According|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b/i;
const LIVED =
  /\b(lo|gue|jam\s+\d|ding |lapar|notif|debit|checkout|tagihan|transfer|scroll|mati|nyala|temen|ortu)\b/i;

function field(brief, which) {
  const re = which === "HEADLINE" ? HEADLINE_RE : BODY_RE;
  const m = re.exec(brief || "");
  return m ? m[1].trim() : "";
}

function scorePlan(plan) {
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  const fails = [];
  const warns = [];
  let points = 0;
  const maxPoints = 8;

  const cover = slides.find((s) => s.kind === "cover");
  const coverH = cover ? field(cover.brief, "HEADLINE") : "";
  const contents = slides.filter((s) => s.kind === "content");

  // 1 cover LO/GUE or ?
  if (/\b(LO|GUE)\b/i.test(coverH) || /\?/.test(coverH)) {
    points += 1;
  } else {
    fails.push(
      `cover: no LO/GUE and no ? — gold pack uses LO on ~13/20 covers. Got: "${coverH.slice(0, 60)}"`
    );
  }

  // 2 cover has number or money mark
  if (/\d|RP|Rp|%/.test(coverH)) {
    points += 1;
  } else {
    warns.push(`cover: no digit/RP/% — weaker nerve without a number`);
  }

  // 3 not dead telegram (3+ short clauses). Ignore dots inside numbers (RP5.000).
  const coverNoNumDots = coverH.replace(/(?<=\d)\.(?=\d)/g, "");
  const clauses = coverNoNumDots
    .split(".")
    .map((x) => x.trim())
    .filter(Boolean);
  // AI staccato: 3+ periods as clause breaks, no question, and no LO/GUE nerve
  if (
    clauses.length >= 3 &&
    !/\?/.test(coverH) &&
    !/\b(LO|GUE)\b/i.test(coverH)
  ) {
    fails.push(
      `cover: telegram 3+ clauses without LO/GUE/? — AI staccato. Got: "${coverH}"`
    );
  } else {
    points += 1;
  }

  // 4 bad slang
  const blob = slides.map((s) => s.brief || "").join("\n");
  if (BAD_SLANG.test(blob)) {
    fails.push(`banned forced-slang (DIEM/KECIK/NYENGAT/THIN)`);
  } else {
    points += 1;
  }

  // 5 named density >= 30% content (gold ~40%)
  let named = 0;
  let thin = 0;
  let lived = 0;
  let cmdOpen = 0;
  let srcFirst = 0;
  let words = 0;
  for (const s of contents) {
    const b = field(s.brief, "BODY");
    const w = b.split(/\s+/).filter(Boolean).length;
    words += w;
    if (w > 0 && w < 20) thin += 1;
    if (NAMED.test(b)) named += 1;
    if (LIVED.test(b)) lived += 1;
    if (CMD_OPEN.test(b.trim())) cmdOpen += 1;
    if (SRC_FIRST.test(b.trim())) srcFirst += 1;
  }
  const n = contents.length || 1;
  const namedPct = named / n;
  const avgWords = words / n;

  // named: hard need ≥2 slides with names; score point needs ≥30%
  if (named >= 3 && namedPct >= 0.3) {
    points += 1;
  } else if (named >= 2) {
    warns.push(
      `named density soft: ${named}/${n} (${Math.round(namedPct * 100)}%) — stretch ≥3 slides / 30% (gold ~40%)`
    );
  } else {
    fails.push(
      `named density: ${named}/${n} content slides (${Math.round(namedPct * 100)}%) — need ≥2 slides with named entity/source (OJK, Kredivo, Shopee…). Gold avg ~40%.`
    );
  }

  // 6 avg body words — gold ~29; hard-fail only if severely thin
  if (avgWords >= 26) {
    points += 1;
  } else if (avgWords >= 23) {
    warns.push(
      `body short: avg ${avgWords.toFixed(1)} words (gold ~29) — add mechanism, not filler`
    );
  } else {
    fails.push(
      `body too thin: avg ${avgWords.toFixed(1)} words (need ≥23; gold ~29)`
    );
  }

  // 7 lived open on most content
  if (lived / n >= 0.5) {
    points += 1;
  } else {
    warns.push(
      `lived beat low: ${lived}/${n} bodies have lo/gue/jam/notif… — risk of lecture mode`
    );
  }

  // 8 sources count
  const srcs = (plan.sources || []).filter(
    (s) => s && String(s.link || s.url || "").startsWith("http")
  );
  if (srcs.length >= 3) {
    points += 1;
  } else {
    fails.push(`sources: ${srcs.length} http links (need ≥3 specific, not homepage-only)`);
  }

  if (srcFirst > 0) {
    fails.push(`source-first body open on ${srcFirst} slide(s) — human beat first`);
  }
  if (cmdOpen >= 3) {
    fails.push(
      `command-sandwich: ${cmdOpen} bodies open with Buka/Tulis/Catat… — tips pile, not insight`
    );
  }
  if (thin >= 3) {
    fails.push(`${thin} bodies under 20 words — pad with mechanism, not adjectives`);
  }

  // homepage-only sources soft fail
  const weakHome = srcs.filter((s) => {
    try {
      const u = new URL(s.link || s.url);
      return (u.pathname === "/" || u.pathname === "") && !u.search;
    } catch {
      return false;
    }
  });
  if (weakHome.length >= 2) {
    warns.push(
      `${weakHome.length} sources look like homepage-only — prefer article/S&K/report URLs`
    );
  }

  return {
    points,
    maxPoints,
    named,
    contentN: n,
    namedPct,
    avgWords,
    lived,
    cmdOpen,
    srcFirst,
    thin,
    sources: srcs.length,
    coverH,
    fails,
    warns,
  };
}

async function main() {
  let plan;
  try {
    plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  } catch (e) {
    console.log(`FAIL plan: unreadable (${e.message})`);
    process.exit(1);
  }

  const r = scorePlan(plan);
  console.log(
    `quality: ${r.points}/${r.maxPoints} | named ${r.named}/${r.contentN} (${Math.round(r.namedPct * 100)}%) | avgWords ${r.avgWords.toFixed(1)} | sources ${r.sources}`
  );
  console.log(`cover: ${r.coverH}`);
  for (const w of r.warns) console.log(`WARN ${w}`);
  for (const f of r.fails) console.log(`FAIL ${f}`);

  const hardFail = r.fails.length > 0 || r.points < MIN_SCORE;
  if (hardFail) {
    console.log(
      `\nquality: FAIL — need score≥${MIN_SCORE} and zero FAIL lines (see writing-research-id.md).`
    );
    process.exit(1);
  }
  console.log(`\nquality: clean (score ${r.points}/${r.maxPoints} ≥ ${MIN_SCORE})`);
}

main().catch((e) => {
  console.log(`FAIL plan: ${e.message}`);
  process.exit(1);
});

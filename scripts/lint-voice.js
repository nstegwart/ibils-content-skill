#!/usr/bin/env node
/**
 * Voice + ethics smoke gate for Ibils carousel plan.json (ID and EN).
 *
 * Runs AFTER lint-plan.js. Catches "facts OK, sentences OFF" patterns that
 * the receipt linter cannot see: otak metaphors, source-first bodies,
 * 260-workdays cover farm, etc.
 *
 * Full doctrine (voice + KODE ETIK / Law 7 — right thrift, right spend;
 * gunting tumpul = false thrift): references/voice-no-slop.md
 * Gold bar: items 5101–5120, 5301–5320 (ID), 5201–5220 (EN).
 *
 *   node lint-voice.js <plan.json>
 * Exit 0 = clean. Exit 1 = FAIL.
 *
 * Ethics that need human judgment (sunk-cost virtue, false thrift endings)
 * are self-check in voice-no-slop.md — this file enforces the detectable slop.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLAN_PATH = process.argv[2];
if (!PLAN_PATH) {
  console.error("usage: node lint-voice.js <plan.json>");
  process.exit(1);
}

const HEADLINE_RE = /HEADLINE:\s*"([^"]*)"/i;
const BODY_RE = /BODY:\s*"([^"]*)"/is;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLOCATION_BAN_PATH = path.join(
  __dirname,
  "../references/id-collocation-ban.json"
);

function field(brief, which) {
  const re = which === "HEADLINE" ? HEADLINE_RE : BODY_RE;
  const m = re.exec(brief || "");
  return m ? m[1].trim() : "";
}

/** Owner-nit bank: wrong ID collocations that sound like AI, not friends. */
async function loadCollocationRules() {
  try {
    const raw = JSON.parse(await fs.readFile(COLLOCATION_BAN_PATH, "utf8"));
    const rules = Array.isArray(raw.rules) ? raw.rules : [];
    return rules
      .filter((r) => r && r.pattern && r.id)
      .map((r) => ({
        id: r.id,
        fix: r.fix || "see id-collocation-ban.json",
        re: new RegExp(r.pattern, "i"),
        example_bad: r.example_bad || "",
      }));
  } catch (e) {
    console.log(
      `WARN collocation ban unreadable (${e.message}) — continuing without bank`
    );
    return [];
  }
}

// Source/date-first body openers (ID + EN)
const SRC_FIRST = /^(Menurut|Per\b|OJK\b|BPS\b|BI\b|ANTARA\b|CNBC\b|Katadata\b|Kompas\b|Detik\b|SWA\b|IdScore\b|BLS\b|Fed\b|Deloitte\b|FinanceBuzz\b|Reuters\b|WSJ\b|Nielsen|YouGov|According to|Per the|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\b/i;

// AI-clever metaphors / English welds in ID-ish copy
const OTAK = /\botak\s*(baca|lo|bilang|buta|belum|ngerasa)?\b|\botak\b/i;
const DADA = /\bdada\s+lo\s+naik\b/i;
const EN_WELD_ID = /\b(framing\s+UI|reward\s+app|soft[- ]?sell)\b/i;
const BUFFER_ID = /\bbuffer\b/i;
// Cover POV mash: GUE + LO in same headline (owner: one angle only)
const POV_MASH_COVER = /\bGUE\b[\s\S]{0,80}\bLO\b|\bLO\b[\s\S]{0,80}\bGUE\b/i;

// EN template farm
const WORKDAYS_FARM =
  /\$?\d[\d.,]*\s*.{0,40}\b260\b.{0,20}\b(workdays?|days)\b.{0,40}\b(trip|vacation|goal|buffer)\b/i;
const TRIP_NEVER = /\b(TRIP|VACATION)\s+YOU\s+NEVER\b/i;

// Cover must name a money-object-ish thing for product-ish surfaces
const MONEY_OBJECT =
  /\b(paylater|spaylater|kredivo|shopee|gopay|dana|ovo|netflix|spotify|disney|gym|bpjs|thr|cicilan|kpr|pinjol|token|wifi|beras|motor|iphone|hp|kartu|admin|bunga|denda|split|temen|ortu|gofood|grab|ojol|indihome|rekening|tabungan|deposito|overdraft|rent|mortgage|bnpl|icloud|subscription|delivery|doordash|uber|latte|coffee|paycheck|salary|bill|tagihan|kredit|umroh|sewa|kontrakan|angsuran|limit|pajak|pln|qris|belanja|resto|nasi|atm|parkir|bensin|listrik|admin|bbm|krl|transjakarta|trial|langganan|ongkir|gofood|warung|thp|thr|bonus|premi|asuransi|deposito|reksa|roi|fee|mdr|qris|spaylater|kredivo|spotify|netflix|youtube|galon|botol|minimarket|pasar|laundry|jajan|kuota|wifi|indihome|token|pln|pkb|stnk|servis|bensin|parkir|tiket|konser|live|cashback|voucher|flash|sale|limit|cicilan|utang|piutang|freelance|ojol|bonus|lembur|thp|slip|pajak|pph|sewa|deposit|kontrakan|spp|les|kursus|bersalin|obat|resep|faskes|rs|gas|tabung|stok|omzet|margin|unit-link|polis|klaim|bi-fast|bifast|transfer|makan|uang|tabung|gas|saldo|e-wallet|gopay|ovo|dana)\b/i;

// Abstract finance cover: verb + number + LO/? but NO product/bill → reader: "bahas apa?"
// Owner 2026-07-15: "BAYAR MINIMUM RP300RB. LO KIRA UDAH AMAN?" = AI slop (no kartu/tagihan).
const ABSTRACT_FINANCE_VERB =
  /\b(bayar\s+minimum|minimum\s+bayar|udah\s+aman|sudah\s+aman|udah\s+beres|lancar|disiplin\s+bayar)\b/i;

async function main() {
  let plan;
  try {
    plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  } catch (e) {
    console.log(`FAIL plan: unreadable JSON (${e.message})`);
    process.exit(1);
  }

  const surface = String(plan.surface || "");
  const isId = /carousel-id|indonesia|^id$/i.test(surface);
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  const collocationRules = isId ? await loadCollocationRules() : [];
  let failCount = 0;
  let warnCount = 0;

  const fail = (msg) => {
    failCount += 1;
    console.log(msg);
  };
  const warn = (msg) => {
    warnCount += 1;
    console.log(msg);
  };

  let coverHl = "";
  let contentBodies = 0;
  let srcFirstBodies = 0;

  slides.forEach((slide, idx) => {
    const n = String(idx).padStart(2, "0");
    const kind = slide.kind || "?";
    const brief = slide.brief || "";
    const hl = field(brief, "HEADLINE");
    const body = field(brief, "BODY");
    const blob = `${hl} ${body}`;

    if (kind === "cover") coverHl = hl;

    // otak / dada / framing
    if (OTAK.test(blob)) {
      fail(
        `FAIL slide ${n} (${kind}): "${hl.slice(0, 60)}" — banned "otak …" metaphor (AI slop). Rewrite as plain lo/gue / you speech.`
      );
    }
    if (DADA.test(blob)) {
      fail(
        `FAIL slide ${n} (${kind}): banned "dada lo naik" clever default — say the feeling in plain words.`
      );
    }
    if (isId && EN_WELD_ID.test(blob)) {
      fail(
        `FAIL slide ${n} (${kind}): English-weld jargon (${blob.match(EN_WELD_ID)[0]}) — write Bahasa a friend would say.`
      );
    }
    if (isId && BUFFER_ID.test(blob)) {
      fail(
        `FAIL slide ${n} (${kind}): use "cadangan" / "sisa" / "dana darurat" — not English "buffer".`
      );
    }

    // Owner-nit collocations (ID only) — never soft-warn; hard FAIL so ship dies
    if (isId && collocationRules.length) {
      for (const rule of collocationRules) {
        if (rule.re.test(blob)) {
          const hit = blob.match(rule.re)?.[0] || rule.id;
          fail(
            `FAIL slide ${n} (${kind}): collocation "${hit}" (${rule.id}).\n` +
              `  Fix: ${rule.fix}` +
              (rule.example_bad ? `\n  Bad: ${rule.example_bad}` : "")
          );
        }
      }
    }

    // EN farm
    if (!isId && (WORKDAYS_FARM.test(hl) || TRIP_NEVER.test(hl))) {
      fail(
        `FAIL slide ${n} (${kind}): 260-workdays / "trip you never booked" cover farm — banned template.`
      );
    }

    // source-first body
    if (kind === "content" && body) {
      contentBodies += 1;
      if (SRC_FIRST.test(body)) {
        srcFirstBodies += 1;
        fail(
          `FAIL slide ${n} (content): body opens like a press release / citation.\n` +
            `  Got: "${body.slice(0, 90)}…"\n` +
            `  Fix: human beat first (you/lo situation); tuck source mid-sentence or after.`
        );
      }
    }
  });

  // Cover must hit a nerve object for ID (and strongly preferred EN)
  if (coverHl) {
    if (isId && POV_MASH_COVER.test(coverHl)) {
      fail(
        `FAIL cover: GUE+LO mash in one headline — pick ONE POV.\n` +
          `  Got: "${coverHl}"\n` +
          `  Fix: all LO (default) or full GUE monologue — never mix.`
      );
    }
    // Owner: LO/? alone is NOT enough — stranger must know WHAT bill/product in 1s.
    // "BAYAR MINIMUM RP300RB. LO KIRA UDAH AMAN?" = abstract finance = AI slop.
    if (isId && !MONEY_OBJECT.test(coverHl)) {
      if (ABSTRACT_FINANCE_VERB.test(coverHl)) {
        fail(
          `FAIL cover: abstract finance (minimum/bayar/aman) without product/bill name.\n` +
            `  Got: "${coverHl}"\n` +
            `  Fix: sebut kartu kredit / tagihan / paylater / Netflix / ortu… di napas pertama.\n` +
            `  Good: "TAGIHAN KARTU KREDIT RP5JT. LO BAYAR MINIMUM RP300RB — LO KIRA BERES?"`
        );
      } else {
        fail(
          `FAIL cover: produk/tagihan gak disebut — org gak ngerti lagi bahas apa.\n` +
            `  Got: "${coverHl}"\n` +
            `  Gold: "PAYLATER LIMIT NAIK?…" / "GUE BAYAR NETFLIX RP186RB…"`
        );
      }
    }
    if (!isId && WORKDAYS_FARM.test(coverHl)) {
      fail(`FAIL cover: 260-workdays farm skeleton.`);
    }
  } else {
    fail("FAIL cover: missing HEADLINE");
  }

  // Deck density of source-first (belt + suspenders — individual fails already counted)
  if (contentBodies >= 4 && srcFirstBodies >= 3) {
    fail(
      `FAIL deck: ${srcFirstBodies}/${contentBodies} content bodies open with source/date — reportage stack, not a friend story.`
    );
  }

  // Product soft-sell spam
  const softSell = slides.filter((s) =>
    /catat di ibils|open ibils|di ibils[, ]|fitur ibils|ibils —/i.test(
      `${field(s.brief, "HEADLINE")} ${field(s.brief, "BODY")}`
    )
  );
  if (softSell.length >= 3) {
    fail(
      `FAIL deck: ${softSell.length} slides soft-sell Ibils — product is minority. Prefer notes/calendar/pos.`
    );
  } else if (softSell.length === 2) {
    warn(
      `WARN deck: ${softSell.length} slides mention Ibils product — keep product soft-tie rare.`
    );
  }

  if (failCount) {
    console.log(
      `\nvoice: ${failCount} FAIL — rewrite slop (see references/voice-no-slop.md).`
    );
    process.exit(1);
  }
  // Ethics is mostly human judgment; print a one-line reminder on clean so writers
  // never forget Law 7 (false thrift / sunk-cost virtue). See voice-no-slop.md.
  if (warnCount) {
    console.log(
      `voice: clean (${slides.length} slides, ${warnCount} warn) — still re-check KODE ETIK (right thrift / right spend; gunting tumpul).`
    );
  } else {
    console.log(
      `voice: clean (${slides.length} slides) — re-check KODE ETIK: hemat where thrift is right; replace/spend where thrift is false.`
    );
  }
}

main().catch((e) => {
  console.log(`FAIL plan: ${e.message}`);
  process.exit(1);
});

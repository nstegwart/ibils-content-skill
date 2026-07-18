#!/usr/bin/env node
/**
 * Copy linter — the mechanical gate that keeps carousel copy from going vague.
 *
 * Scans a plan.json and HARD-FAILS slides whose copy is dumb in a way a machine
 * can prove: banned empty-payoff phrases, teaser headlines, a body too thin to
 * carry information, or a body that just restates the headline. Weak-but-not-
 * provable cases are reported as WARN for the human/codex self-review.
 *
 * Image generation must not start until this exits 0. gen-carousel.js runs it
 * automatically; you can also run it by hand:
 *   node lint-plan.js <plan.json>
 *
 * Exit 0 = clean. Exit 1 = at least one FAIL (or plan unreadable).
 */
import fs from "node:fs/promises";

const PLAN_PATH = process.argv[2];
if (!PLAN_PATH) {
  console.error("usage: node lint-plan.js <plan.json>");
  process.exit(1);
}

// English function words — stripped before measuring real content.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "so", "to", "of", "in", "on", "at", "by",
  "for", "with", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "you", "your", "yours", "we",
  "our", "they", "their", "he", "she", "his", "her", "i", "my", "me",
  "do", "does", "did", "has", "have", "had", "will", "would", "can", "could",
  "just", "not", "no", "if", "then", "than", "there", "here", "up", "out", "about"
]);


// ════════════════════════════════════════════════════════════════════════════
// LAW 1 — THE RECEIPT LAW.  The root-cause gate. This is what replaces the banlist.
//
// A sentence reads as "AI-written" because THERE IS NO INFORMATION IN IT. A model handed an
// information vacuum fills it with SHAPE — rhythm, balance, a triplet, a payoff. Ban the triplet
// and the vacuum simply grows a different shape. That is why a banlist is stale by construction:
// it can only catch a phrase somebody already caught.
//
// The reference account in this niche writes in plain, unremarkable prose and NOT ONE sentence
// reads as AI — because every sentence is a falsifiable proposition. "74 kg emas batangan disita
// dari Kafe de'Clan senilai Rp67,2 miliar" cannot be faked; the research IS the writing.
//
// So the gate is not "does this sentence sound bad". It is: DOES THIS SLIDE CARRY A RECEIPT?
// A number with a unit. A named thing. A date. An attributed quote. A concrete mechanism step.
// And it must be a receipt NO EARLIER SLIDE ALREADY CARRIED — a restated fact is padding.
//
// A machine can verify a number EXISTS. It cannot verify the number is TRUE. Provenance stays
// human, plus the sources[] array, plus the critic. Said plainly so nobody mistakes this for a
// fact-checker.
const MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
const OURS = new Set(["ibils", "himel", "instagram", "whatsapp", "the", "your", "you", "a", "an"]);

function factTokens(text) {
  const t = String(text || "");
  const out = new Set();

  // (a) figures that mean something — money, percentages, years, counted nouns
  for (const m of t.matchAll(/\b(?:rp|usd|idr|\$)\s?[\d.,]+\s?(?:rb|ribu|jt|juta|m|miliar|t|triliun|k|bn|bio)?\b/gi)) out.add("num:" + m[0].toLowerCase().replace(/\s+/g, ""));
  for (const m of t.matchAll(/\b\d[\d.,]*\s?%/g)) out.add("num:" + m[0].replace(/\s+/g, ""));
  for (const m of t.matchAll(/\b(?:19|20)\d{2}\b/g)) out.add("num:" + m[0]);
  for (const m of t.matchAll(/\b\d[\d.,]*\s+[a-z]{3,}/gi)) out.add("num:" + m[0].toLowerCase().replace(/\s+/g, " "));

  // (b) named things — something that exists in the world and can be looked up.
  //     Three shapes, and MISSING ANY OF THEM MAKES THE GATE LIE: an early version only caught
  //     multi-word names and reported "0% named entities" on a deck stuffed with OJK and Kredivo.
  //     - ACRONYMS:      OJK, BPS, FIFA, BNPL     (all-caps, 2-5 letters)
  //     - MULTI-WORD:    Bank Indonesia, Robby Tjahjadi
  //     - SINGLE PROPER: Kredivo, Shopee          (capitalised, NOT sentence-initial)
  for (const m of t.matchAll(/\b[A-Z]{2,5}\b/g)) {
    const k = m[0].toLowerCase();
    if (OURS.has(k)) continue;
    out.add("ent:" + k);
  }
  for (const m of t.matchAll(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+/g)) {
    const k = m[0].toLowerCase();
    if (OURS.has(k.split(" ")[0]) || MONTHS.test(k)) continue;
    out.add("ent:" + k);
  }
  // single capitalised word, only when it is NOT the first word of a sentence
  for (const m of t.matchAll(/(?:[a-z,]\s+)([A-Z][a-z]{3,})\b/g)) {
    const k = m[1].toLowerCase();
    if (OURS.has(k) || MONTHS.test(k)) continue;
    out.add("ent:" + k);
  }

  // (c) an attributed quote — someone said this, on the record
  for (const m of t.matchAll(/[""][^""]{12,}[""]/g)) out.add("quote:" + m[0].slice(0, 40).toLowerCase());

  return out;
}

// A mechanism — a causal chain with concrete objects — is a legitimate receipt when there is no
// number to hand ("the merchant pays 2%, SO the app can afford your 0% instalment"). Capped: two
// per deck. Past that you are describing, not reporting.
const MECH_RE = /\b(because|since|so that|which means|that's why|as a result|then|after|until)\b/i;

// EMPTY PAYOFFS — sentences that sound like a benefit but carry zero information.
// These are the phrases a language model reaches for when it has nothing to say.
const BANNED = [
  "peace of mind", "feel the difference", "live better", "stay on top of things",
  "smarter money habits", "take control of your finances", "financial freedom",
  "make every rupiah count", "money made simple", "your money, your way",
  "small steps", "little wins", "life-changing", "the things that matter"
];

// MARKETING FLUFF + LLM THROAT-CLEARING — the loudest "written by an AI" tells in English.
// A triplet of balanced clauses ("faster, easier, and more accurate") is the single strongest
// one and is caught structurally below, not by string match.
const BANNED_AWKWARD = [
  "unlock", "seamless", "seamlessly", "game-changer", "game changer", "supercharge",
  "effortlessly", "effortless", "revolutionary", "revolutionize", "all-in-one",
  "best-in-class", "cutting-edge", "leverage", "empower", "elevate your",
  "in today's fast-paced world", "in today's world", "let's dive in", "let's face it",
  "it's no secret that", "the truth is", "here's the thing", "look no further",
  "say goodbye to", "welcome to the future"
];


// Hedge words — soften a claim that should land direct. Forecast-attribution
// is the usual culprit ("BI diperkirakan menaikkan ..."). Use a direct claim
// with the source name instead ("Kumparan: BI bakal naikin suku bunga").
// HEDGES — a slide that hedges is a slide with no claim.
const BANNED_HEDGE = [
  "reportedly", "allegedly", "apparently", "supposedly", "arguably",
  "some say", "it is said", "experts believe", "rumour has it", "rumor has it",
  "might just", "could potentially", "may well"
];

// Teaser headlines that hide the point instead of stating it.
const TEASER = [
  "the secret to", "here's the secret", "here's how", "here's what", "this is how",
  "what you need to know", "what nobody tells you", "you won't believe",
  "the one thing", "read on", "keep reading", "find out why", "turns out"
];

// Concrete instruction verbs — a content body should usually tell you to DO
// something. Matched loosely (prefix/suffix tolerant).
const ACTION_ROOTS = [
  // EN
  "log", "write", "open", "check", "review", "set aside", "move", "pick",
  "compare", "flag", "stop", "count", "add", "split", "delay", "cut",
  "buy", "cook", "save", "share", "separate", "sort", "install",
  "track", "cap", "collect", "switch", "turn off", "delete", "swap", "start",
  "pay", "tidy", "cancel", "unsubscribe", "screenshot", "forward", "send",
  // ID — otherwise good Bahasa bodies false-fail as "abstract"
  "buka", "tulis", "catat", "cek", "hitung", "bandingkan", "pindah", "stop",
  "bayar", "screenshot", "hapus", "set", "atur", "sisip", "sisih", "potong",
  "transfer", "lunasi", "naikin", "turunin", "matikan", "aktifkan", "screenshot"
];

// Concrete number / time signals.
const NUMBER_RE = /\d|\brp\b|percent|%|a month|a week|a day|daily|weekly|monthly|every day|every week|every month|weekend|payday|per month|per week|sebulan|seminggu|setahun|tiap gajian|setiap gajian|hari gajian/i;
// Cause / mechanism / purpose connectors — mark an explanatory concrete body.
const MECHANISM = [
  "because", "since", "when", "so that", "which means", "that's why", "as a result", "after",
  // ID
  "karena", "biar", "supaya", "makanya", "setelah", "sebelum", "jadi ", "artinya", "yang artinya"
];

function field(brief, name) {
  const m = String(brief || "").match(new RegExp(`${name}:\\s*"([^"]*)"`, "i"));
  return m ? m[1].trim() : "";
}

// crude English stem — drop common inflections so "logging"~"log", "tracked"~"track".
function stem(w) {
  let s = w.toLowerCase();
  s = s.replace(/(ing|edly|ed|ies|es|s|ly)$/, "");
  return s.length >= 3 ? s : w.toLowerCase();
}

function contentWords(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function lintSlide(slide, idx) {
  const fails = [];
  const warns = [];
  const headline = field(slide.brief, "HEADLINE");
  const body = field(slide.brief, "BODY");
  const hay = `${headline} ${body} ${slide.brief}`.toLowerCase();

  if (slide.kind !== "closing" && !headline) {
    fails.push("missing HEADLINE");
  }
  // LAYOUT, not copy. This lives here only because the closing headline is composited beside the
  // phone and a long one wraps into it. It is a geometry constraint wearing a writing rule's
  // clothes — the honest fix is to widen the reserved zone in finalize.js, not to police the
  // writer. Loosened from 2 words to 4 and demoted to a WARN until that geometry is fixed.
  if (slide.kind === "closing" && headline) {
    const words = headline.split(/\s+/).filter(Boolean);
    if (headline.length > 28 || words.length > 4) {
      warns.push(
        `closing headline is ${headline.length} chars / ${words.length} words — it may wrap into ` +
        `the composited phone. This is a GEOMETRY limit, not a writing rule; if the line is right, ` +
        `widen the reserved zone in finalize.js instead of cutting the words.`
      );
    }
  }
  // THE BANLIST IS DEMOTED. It is no longer the definition of quality — it is a smoke detector.
  // String checks are nearly free and catch the highest-frequency garbage early, so they stay. But
  // every one of them now says what it actually means, because rewording the phrase fixes nothing:
  // reaching for an empty phrase is a SYMPTOM of having no fact to write down (LAW 1).
  const ROOT = `\n    This phrase is not the disease. It is what a writer reaches for when they have ` +
    `nothing to say yet. Do not reword it — go find the fact, and write THAT (LAW 1: every slide ` +
    `carries a receipt).`;
  for (const p of BANNED) {
    if (hay.includes(p)) fails.push(`empty phrase: "${p}"${ROOT}`);
  }
  // LAW 2 — THE GAP LAW.  (This REPLACES a blanket ban that was half wrong.)
  //
  // We used to FAIL every question headline and every "5 ways to..." listicle. But the reference
  // account's covers are ALL deferrals — "Apa Saja Kasusnya?", "Gimana Modusnya?", "Kenapa bisa
  // mangkrak?" — and two of its best decks are listicles (13 corruption cases; 6 countries). They
  // work, and ours didn't, and the difference is not the shape.
  //
  // THE DIFFERENCE IS RECEIPTS. Their cover shows a name, a number and a photograph BEFORE it
  // withholds anything: "KORUPSI BATU BARA DIDUGA PICU BLACKOUT / NEGARA RUGI Rp5 TRILIUN" — then
  // asks. Our shipped cover deferred while showing NOTHING: "Why you overspend — and how to stop."
  //
  // So: a cover may ask a question or promise a list — but only if it has already put something on
  // the table. Deferral WITHOUT an anchor is a promise with no collateral. On a CONTENT slide the
  // deferral stays banned outright: mid-deck is for paying, not promising.
  const DEFER = /\b(how to|ways? to|things? (you|to)|steps? to|tips?|secrets?|reasons? (why|you)|what (you|nobody)|find out|keep reading)\b/i;
  const LISTICLE = /^\s*\d+\s+\w+/;
  if (headline) {
    const defers = DEFER.test(headline) || LISTICLE.test(headline);
    if (defers) {
      if (slide.kind === "cover") {
        const anchors = factTokens(headline + " " + body);
        if (!anchors.size) {
          fails.push(
            `cover defers with no anchor: "${headline}" — it asks the reader to swipe on nothing. ` +
            `A question or a list is FINE on a cover, but only after you put something on the table: ` +
            `a number, a name, a date. Show the receipt, THEN withhold one thing.`
          );
        }
      } else {
        fails.push(
          `deferral on a content slide: "${headline}" — mid-deck is for PAYING, not promising. ` +
          `State the thing.`
        );
      }
    }
  }

  // THE BALANCED TRIPLET — the strongest "written by an AI" tell in English, and the one no
  // string-match can catch: three parallel items in a row ("faster, easier, and more accurate";
  // "track it, tag it, forget it"). A human writes two, or four, or an uneven list. A model writes
  // three balanced ones almost every time. Detected structurally.
  for (const sentence of hay.split(/[.!?\n]+/)) {
    const parts = sentence.split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    const tail = parts.slice(-3);
    if (!/^(and|or)\b/i.test(tail[2])) continue;          // "..., and X" — the closing beat
    // Measure only the LAST TWO items. The first item is usually welded to the sentence stem
    // ("Ibils makes budgeting FASTER, easier, and more accurate"), so counting its words measures
    // the sentence, not the item, and the triplet slips through. The parallelism lives in the tail.
    const lens = tail.slice(1).map((x) => x.replace(/^(and|or)\s+/i, "").trim().split(/\s+/).length);
    const spread = Math.max(...lens) - Math.min(...lens);
    if (spread <= 1 && lens.every((n) => n <= 3)) {
      fails.push(
        `balanced triplet: "${sentence.trim()}" — three parallel clauses is the loudest ` +
        `AI-written tell there is. Cut it to two, or make one of them uneven.`
      );
    }
  }
  for (const p of BANNED_AWKWARD) {
    if (hay.includes(p)) {
      fails.push(`AI-tell "${p}" — marketing fluff or LLM throat-clearing.${ROOT}`);
    }
  }
  for (const p of BANNED_HEDGE) {
    // bound to word boundary so "disebutkan" still trips "disebut"
    const re = new RegExp(`\\b${p}\\b`, "i");
    if (re.test(hay)) {
      fails.push(
        `hedge word "${p}" — state the claim direct; cite the source name ` +
          `("Kumparan: BI bakal naikin suku bunga") instead of softening it`
      );
    }
  }
  for (const p of TEASER) {
    if (headline.toLowerCase().includes(p)) fails.push(`teaser headline: "${p}"`);
  }

  // content slides carry a teaching BODY — judge it
  if (slide.kind === "content") {
    if (!body) {
      fails.push("content slide has no BODY");
    } else {
      const bWords = contentWords(body);
      if (bWords.length < 6) {
        fails.push(`body too thin (${bWords.length} content words)`);
      }
      // restatement: how much does the body add beyond the headline?
      const hStems = new Set(contentWords(headline).map(stem));
      const newStems = [...new Set(bWords.map(stem))].filter((s) => !hStems.has(s));
      if (newStems.length < 4) {
        fails.push(`body restates headline (only ${newStems.length} new ideas)`);
      }
      // concreteness: a real instruction, a number, or an explained mechanism.
      // A `di-` prefixed word is PASSIVE (describes a state) — it is not an
      // instruction, so it does not count as a concrete action.
      const hasAction = bWords.some(
        (w) => !w.startsWith("di") && ACTION_ROOTS.some((r) => stem(w) === stem(r))
      );
      const hasNumber = NUMBER_RE.test(body);
      const hasMechanism = MECHANISM.some((m) => body.toLowerCase().includes(m));
      if (!hasAction && !hasNumber && !hasMechanism) {
        fails.push(
          "body is abstract — it states no action to take, no number, and no " +
          "cause/mechanism. Rewrite it to tell the reader what to DO or explain WHY."
        );
      }
    }
  }
  return { idx, kind: slide.kind, headline, fails, warns };
}

async function main() {
  let plan;
  try {
    plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  } catch (e) {
    console.error(`cannot read plan: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(plan.slides) || !plan.slides.length) {
    console.error("plan has no slides");
    process.exit(1);
  }

  let failCount = 0;
  let warnCount = 0;
  plan.slides.forEach((slide, i) => {
    const r = lintSlide(slide, i + 1);
    const tag = `slide ${String(r.idx).padStart(2, "0")} (${r.kind})`;
    if (r.fails.length) {
      failCount += r.fails.length;
      console.log(`FAIL ${tag}: ${r.headline}`);
      r.fails.forEach((f) => console.log(`  - ${f}`));
    }
    r.warns.forEach((w) => {
      warnCount++;
      console.log(`WARN ${tag}: ${w}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // LAW 7 — THE AUDIENCE LAW.  A fact must belong to the person reading it.
  //
  // This exists because a deck passed EVERY OTHER GATE and was still wrong. It was written in
  // English for the global account, and every fact in it was Indonesian — Kredivo, Akulaku, OJK,
  // Rupiah. It was true. It was sourced to primary documents. It was gated clean. And a reader in
  // London has never heard of Kredivo.
  //
  // The owner caught it in one sentence: "Kenapa konten inggris tapi masalahnya masalah indo?"
  //
  // A deck can be true, sourced, and perfectly linted, and still be aimed at people who have never
  // heard of the thing it is about. So: declare the surface, and the facts must match it.
  const SURFACE = plan.surface || "";
  const LOCAL_ID = /\bRp\s?[\d.]|\brupiah\b|\bOJK\b|\bKredivo\b|\bAkulaku\b|\bShopee ?PayLater\b|\bIndodana\b|\bAtome\b|\btriliun\b|\bmiliar\b|\bjuta\b/i;
  if (/global|^carousel-global/i.test(SURFACE)) {
    const hits = [];
    plan.slides.forEach((slide, i) => {
      const t = `${field(slide.brief, "HEADLINE")} ${field(slide.brief, "BODY")}`;
      const m = t.match(LOCAL_ID);
      if (m) hits.push(`slide ${i + 1}: "${m[0]}"`);
    });
    if (hits.length) {
      failCount++;
      console.log(`FAIL deck: surface is "${SURFACE}" (a GLOBAL audience) but ${hits.length} slide(s) ` +
        `carry Indonesia-only facts:`);
      hits.slice(0, 4).forEach((h) => console.log(`  - ${h}`));
      console.log(`  A reader in London does not have a Kredivo account. The deck can be true, sourced ` +
        `and perfectly gated, and still be aimed at people who have never heard of the thing it is about.`);
      console.log(`  Either move it to an Indonesian surface, or find facts the audience actually has.`);
    }
  }
  if (!SURFACE) {
    warnCount++;
    console.log(`WARN deck: no "surface" declared. State who this is for — the audience law cannot ` +
      `check facts against an audience that was never named.`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // LAW 1 — THE RECEIPT LAW, at deck level. The gate that replaces the banlist.
  //
  // Every content slide must carry a receipt NO EARLIER SLIDE CARRIED. A restated fact is padding,
  // and padding is what a model produces when it has run out of things to say — which is the actual
  // root cause of copy that "reads AI". A slide with no new receipt is not a slide yet.
  let seen = new Set();
  let mechUsed = 0;
  let withNumber = 0, withEntity = 0, contentSlides = 0;

  plan.slides.forEach((slide, i) => {
    const h = field(slide.brief, "HEADLINE");
    const b = field(slide.brief, "BODY");
    const tokens = factTokens(`${h} ${b}`);
    if (slide.kind === "content") {
      contentSlides++;
      if ([...tokens].some((t) => t.startsWith("num:"))) withNumber++;
      if ([...tokens].some((t) => t.startsWith("ent:"))) withEntity++;

      const fresh = [...tokens].filter((t) => !seen.has(t));
      if (!fresh.length) {
        // a concrete causal mechanism is a legitimate receipt when no number is to hand.
        // Owner 2026-07-17: cap raised 2->6 — human-experience decks lean on cause/effect
        // narrative ("because... after... when...") more than digits, and the old cap of 2
        // forced a deck back toward numbers once it ran out of mechanism slots.
        const isMech = MECH_RE.test(b) && b.split(/\s+/).length >= 8;
        if (isMech && mechUsed < 6) {
          mechUsed++;
        } else {
          failCount++;
          console.log(`FAIL slide ${String(i + 1).padStart(2, "0")} (content): ${h}`);
          console.log(`  - NO NEW RECEIPT. This slide carries no fact that an earlier slide did not ` +
            `already carry — no figure, no named thing, no date, no attributed quote, no mechanism.`);
          console.log(`    A sentence reads as AI-written because there is nothing IN it, and a model ` +
            `fills that vacuum with shape. You cannot fix this by rewording. Go find the fact.`);
        }
      }
    }
    tokens.forEach((t) => seen.add(t));
  });

  if (contentSlides >= 3) {
    const numPct = withNumber / contentSlides;
    const entPct = withEntity / contentSlides;
    // Owner 2026-07-17: the hard >=50%-figures FAIL is removed. It was steering every deck toward
    // a dollar-amount-led headline because a figure was the cheapest way to pass — readers are
    // tired of it and the owner wants decks that lead with a lived experience (a life stage, a
    // scarce resource, a moment), with numbers as supporting evidence in the body, not the hook.
    // Law 1 (the receipt law, above) still blocks empty/padded slides via entity/quote/mechanism,
    // so this isn't a return to unverifiable copy — it's removing the NUMBER-specifically quota.
    void numPct;
    if (entPct < 0.3) {
      warnCount++;
      console.log(`WARN deck: only ${Math.round(entPct * 100)}% of content slides name a real thing (aim >=30%).`);
      console.log(`  - Named entities are what make a claim checkable. "A bank" is a shrug; "OJK" is a receipt.`);
    }
  }

  // deck-level: a first word repeated across 3+ headlines is a formulaic
  // scaffold ("JANGAN ...", "STOP ...") — reads as a template, not a writer.
  const firstWord = {};
  for (const slide of plan.slides) {
    const h = field(slide.brief, "HEADLINE").trim().toLowerCase();
    if (!h) continue;
    const w = h.split(/\s+/)[0].replace(/[^a-z]/g, "");
    if (w) (firstWord[w] = firstWord[w] || []).push(h);
  }
  for (const [w, hs] of Object.entries(firstWord)) {
    if (hs.length >= 3) {
      failCount += 1;
      console.log(
        `FAIL deck: ${hs.length} headlines all start with "${w}" — formulaic ` +
          "scaffold, vary the hooks (claim / myth-kill / question / number)"
      );
    }
  }

  if (failCount) {
    console.log(`\nlint: ${failCount} FAIL — rewrite the flagged copy, then re-run. Image generation blocked.`);
    process.exit(1);
  }
  console.log(`lint: clean (${plan.slides.length} slides${warnCount ? `, ${warnCount} warn — review them` : ""})`);
}

main();

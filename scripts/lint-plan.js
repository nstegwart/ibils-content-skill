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
  "log", "write", "open", "check", "review", "set aside", "move", "pick",
  "compare", "flag", "stop", "count", "add", "split", "delay", "cut",
  "buy", "cook", "save", "share", "separate", "sort", "install",
  "track", "cap", "collect", "switch", "turn off", "delete", "swap", "start",
  "pay", "tidy", "cancel", "unsubscribe", "screenshot", "forward", "send"
];

// Concrete number / time signals.
const NUMBER_RE = /\d|\brp\b|percent|%|a month|a week|a day|daily|weekly|monthly|every day|every week|every month|weekend|payday|per month|per week/i;
// Cause / mechanism / purpose connectors — mark an explanatory concrete body.
const MECHANISM = ["because", "since", "when", "so that", "which means", "that's why", "as a result", "after"];

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
  // the closing headline is composited beside a phone — a long one wraps to a
  // 2nd line and gets overlapped. Keep it to one tight line.
  if (slide.kind === "closing" && headline) {
    const words = headline.split(/\s+/).filter(Boolean);
    if (headline.length > 16 || words.length > 2) {
      fails.push(
        `closing headline too long (${headline.length} chars, ${words.length} ` +
          "words) — max 2 words / ~14 chars so it fits ONE line beside the phone"
      );
    }
  }
  for (const p of BANNED) {
    if (hay.includes(p)) fails.push(`banned vague phrase: "${p}"`);
  }
  // THE DEFERRAL — a headline that PROMISES a claim instead of MAKING one.
  //
  // A banlist can only catch a phrase somebody already thought of. "Why you overspend — and how to
  // stop" is not on any banlist, and it shipped. So catch the SHAPE, not the string.
  //
  // The test is simple and it is the whole doctrine: **can a reader disagree with this headline?**
  // "Your problem isn't overspending, it's memory" — you can argue with that. It is a claim.
  // "Why you overspend and how to stop"           — there is nothing to argue with. It is a receipt
  //                                                  for a claim you will be given later.
  // A headline that defers has said nothing, and saying nothing is what "AI-generated" reads as.
  const DEFER = /\b(how to|ways? to|things? (you|to)|steps? to|tips?|secrets?|reasons? (why|you)|what (you|nobody)|why you .* (and|--|—) how)\b/i;
  const LISTICLE = /^\s*\d+\s+\w+/;   // "5 ways...", "7 habits..."
  for (const line of [headline]) {
    if (!line) continue;
    if (DEFER.test(line) || LISTICLE.test(line)) {
      fails.push(
        `deferral: "${line}" — this headline PROMISES a claim instead of MAKING one. Nobody can ` +
        `disagree with it, so it says nothing. Ask: could a reader argue with this? If not, it is a ` +
        `teaser. State the thing. "Your problem isn't overspending, it's memory" is a claim; ` +
        `"why you overspend and how to stop" is a receipt for one.`
      );
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
      fails.push(
        `AI-tell "${p}" — marketing fluff or LLM throat-clearing. Say the actual thing instead.`
      );
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

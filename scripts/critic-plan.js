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

const SYSTEM = `You are a brutal English copy editor. Read an IBILS carousel plan (JSON) and catch
copy that is GRAVELY bad. Be savage about genuinely bad writing; do not nitpick style.

The single thing you are hunting: copy that reads like it was WRITTEN BY AN AI.

Two severities:

== FAIL — GRAVE ONLY (blocking, forces VERDICT: FAIL) ==
- BALANCED TRIPLET: three parallel clauses in a row — "faster, easier, and more accurate",
  "track it, tag it, and forget it", "simple, powerful, and free". This is the loudest
  AI-written tell in English. A human writes two, or four, or something uneven.
- MARKETING FLUFF: "unlock", "seamless", "game-changer", "supercharge", "effortlessly",
  "revolutionary", "all-in-one", "best-in-class", "leverage", "empower", "elevate your".
- EMPTY PAYOFF — a sentence shaped like a benefit that says nothing: "peace of mind",
  "feel the difference", "live better", "stay on top of things", "smarter money habits",
  "take control of your finances", "financial freedom".
- LLM THROAT-CLEARING: "In today's fast-paced world", "Let's dive in", "It's no secret that",
  "Here's the thing", "The truth is", "Say goodbye to".
- HEDGING: "reportedly", "allegedly", "experts believe", "some say", "might just",
  "could potentially". A slide that hedges has made no claim. Forecast attribution is
  hedging too — state it directly.
- INVENTED FEATURES: any claim the app does something it does not do. Email forwarding is
  NOT shipped — only WhatsApp message forwarding. Flag any email claim as GRAVE.
- 3+ headlines in the deck opening with the same word (scaffold formula).
- A body that only restates its headline with no new information.
- Forced wordplay that actually CONFUSES (not merely a weak pun).
- Sentences that are genuinely robotic or unreadable.

== WARN — style nit (NON-blocking, does not change the verdict) ==
- Slightly odd subject that still reads fine.
- Minor pleonasm.
- A slightly long sentence.
- A valid word choice that could be sharper.

== DO NOT FLAG ==
- ALL-CAPS hooks. Casual contractions ("don't", "you're", "gonna").
- Finance terms ("cashflow", "side hustle", "paylater", "BNPL").
- Valid stylistic choices.
- A punchy, contrarian or provocative hook — that is not bad writing, that is the job.

Output format — one line per finding:
FAIL slide <N> (<type>): "<quote>" — <reason> — fix: <suggested rewrite>
WARN slide <N> (<type>): "<quote>" — <note>

End your output with ONE final line, exactly one of:
VERDICT: PASS
VERDICT: FAIL

Verdict rules:
- VERDICT: FAIL ONLY if there is >= 1 grave FAIL.
- WARN-only (no FAIL) -> VERDICT: PASS.
- Clean -> VERDICT: PASS.
`;

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

  // If the model said FAIL but formatted its findings some other way (a leading "- ", bold, a
  // different verb), `fails` is EMPTY — and an empty FAIL report is handed to the fixer, which is
  // then asked to "fix only the flagged slides" with nothing flagged. It loops and then throws.
  // A FAIL with no parsed lines means OUR PARSER missed them, not that there is nothing wrong:
  // dump everything so the fixer (and the human) can actually see it.
  if (verdict === "FAIL" && fails.length === 0) {
    console.log("(critic said FAIL but no line matched the expected format — full output follows)");
    console.log(buf.trim());
  }

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

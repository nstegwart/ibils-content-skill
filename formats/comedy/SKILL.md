---
name: ibils-comedy
description: "Produce a 12-25s comedic vertical short for Ibils. Voice-led (human or deadpan TTS), illustration-driven, Himel optional. Use when the user asks for a funny/comedy video, a joke short, or a humorous reel. Paid surfaces = Bahasa Indonesia, Jakarta lo/gue."
---

# Ibils Comedy Short

**A single rigged expectation, sprung once.** 12–25s. A second punchline is a second video.

The 30s ad is cut to a 90 BPM grid because an ad is music. **A joke cut to an even grid is a joke
delivered by a metronome.** The ear predicts every beat, and comedy is prediction *error*. The grid
is dead here. What replaces it is asymmetry — asserted, not hoped for.

## Why AI comedy dies (the six deaths — five are checkable)

1. **The joke is explained.** The model doesn't trust the punch and appends a restatement. But the
   laugh IS the viewer closing the gap themselves. Explain it and there's nothing left for them to do.
2. **The timing is even.** Text has no clock, so the pause before the punch — the load-bearing
   silence of all spoken comedy — simply doesn't exist in next-token prediction.
3. **The setup telegraphs the punch.** Generation is coherence-optimised: every setup word points at
   the ending. **You cannot catch this by re-reading, because you already know the punchline.**
4. **The punch is mis-positioned.** Models front-load. The funny word must be the LAST thing heard.
5. **The picture illustrates the line.** Voice says "cuma satu", picture shows one item. No gap. The
   gap IS the joke.
6. **The premise is safe.** Consensus observations in funny-shaped words. A personified wallet.

## The gates (run BEFORE a single plate — a dead script is free)

```bash
node runtime/lint-script.mjs comedy script.json    # deaths 1, 2, 4, 5, 6
node runtime/predict-probe.mjs script.json         # death 3
```

The **prediction probe** is the one that cannot be replaced by reading. It hands the SETUP ONLY to
three fresh models and asks what comes next. If they land on your punchline, the audience will too,
and a joke they've already told themselves is not a joke. Observed: the AI default is *always* a
metaphor/personification gag — which is exactly what LAW C4 bans.

## The timing skeleton

| beat | rule |
|---|---|
| setup (2–4 shots) | played **dead straight**. Zero jokes before the turn. Its job is to be BELIEVED. |
| turn | the misdirection breaks |
| **PRE-PUNCH** | **the wrong beat.** ≥40% off the median setup beat, either direction |
| punch | ≤0.6× median setup beat, ≤1.5s. A slap, not a scene. |
| dead air | ≥0.8s of silence. The drum the punch lands on. |
| tag (optional) | same premise, one turn further. A new noun = a smuggled second premise. |
| endcard | the product lives here and **only** here |

**Why 40%:** natural phrase jitter is ±15–25%. Below 40% you get the worst outcome — timing that is
wrong, but not *WRONG*. It reads as sloppy assembly, not intent.

## The laws

- **C4 — the punch is BUILT, not wished for.** Declare `punch_mechanism`: `1` escalated specificity
  (the number goes past reason but stays plausible), `2` physical evidence (the self-lie made into an
  object in frame), `3` quoted self-lie vs cut to reality. There is no fourth.
  **BANNED on sight:** the personified-money family — `dompet gue nangis`, `saldo pamit`, "my wallet
  is crying". The loudest AI finance-joke tell there is.
- **C6 — end-weight.** `punch_word` must be in the last two words. The laugh cannot begin while the
  sentence is still delivering syntax.
- **C7 — the gap law.** The punch FRAME contradicts the voice. Zero shared content nouns between the
  punch line and the punch visual — asserted. In the plate prompt, verbatim:
  > The voiceover says: "<LINE>". Do NOT illustrate this line. The line is a lie the character tells
  > themselves. The picture shows what is ACTUALLY TRUE: <the contradicting physical evidence>.
  > Do not depict: <the key nouns of the line>.

  **The freeze-frame test [HUMAN]:** pause on the punch frame, sound OFF, at phone size. A stranger
  must be able to say what is wrong in two seconds. If the frame needs the voice to be funny, it is a
  caption illustration, not a punch.
- **C8 — the joke never needs the product, and never punches the user.** Strip the endcard: setup →
  turn → punch must still be a complete joke. And the punch is a **first-person confession** — the
  setup may say "lo", the PUNCH lands on "gue". Laughing *with* the narrator at themselves. The joke
  is the BEHAVIOUR (everyone does it), never the poverty (nobody chose it).
- **C10 — Jakarta Gen-Z is a rhythm, not a vocabulary.** One formal connective (`namun`, `adalah`,
  `tersebut`, `Anda`) means the writer's ear was never in register — the whole script goes back to
  Gemini. Max ONE live slang term. And the narrator **never laughs** (`wkwk`, `ngakak`): deadpan is
  the only legal delivery. The comedy is that they're wrong, not that they're funny.
- **C11 — TTS may only play a robot.** macOS `say` has no comedic timing because timing IS delivery.
  Legal only when the script declares the voice as a *machine character* (the flat robot reading your
  47 transactions back to you IS a premise). A TTS voice pretending to be a person ships nothing.

## Inherited from the ad — and what is NOT

**Inherited verbatim:** LAW 2 (de-bait the plate), LAW 3 (restrained motion prompt), LAW 4 (never
stretch time), LAW 5 (no zoompan), LAW 7 (assert every shot) — *except* a shot declared
`freeze: true`, legal only on punch/dead-air/tag, max 2 per video.

**NOT inherited — inheriting these would ruin the format:** LAW 6's light arc (comedy is high-key; a
rising-luminance assert fails every correct comedy short), the 90 BPM grid (quantising a punchline to
a downbeat is anti-timing), and the dissolve grammar (**cuts only** — a dissolve into a punchline is
how a joke dies).

## Voice leads

See `../../runtime/voice/voice.mjs` and `../story/SKILL.md` §voice. The pause before the punch is
**built in the edit**, never performed — a pause inside a single take cannot be adjusted, and the
±40% law will need adjusting.

**Music:** out at least one phrase before the pre-punch, and silent (≤ −60 dBFS) through the dead
air. A music swell under a punchline is the edit laughing at its own joke.

**Captions — the spoiler rule:** the punch caption group contains ONLY the punch words. Zero
lookahead. A caption that shows the punchline while the voice is still in the setup has told the
joke early, silently, to every muted viewer.

---
name: ibils-story
description: "Produce a 30-60s narrative storytelling vertical video for Ibils. Voice-led (human or scratch TTS), illustration-driven, Himel optional. Use when the user asks for a story video, a narrative piece, or an emotional/testimonial short."
---

# Ibils Story Video

30–60s. 5–9 scenes. **Voice-led.**

The ad's spine is a clock (90 BPM, asserted luminance). **A story's spine is a causal chain under
pressure:** a person WANTS something concrete → obstacles connected by THEREFORE/BUT → exactly ONE
turn → a changed state you can see. Time in a story is elastic. Causality is not.

So what the build asserts is not a grid. It is a **scene ledger** — a pre-registration of the
causality, the escalation and the turn, which the finished film is then held to.

**The ledger is the whole trick. A story that cannot fill it honestly is dead before a plate is
generated — which is where dying is free.**

```bash
node runtime/lint-script.mjs story ledger.json
```

## The ledger

```json
{ "want": "one sentence, one concrete object — a number, a thing, a date",
  "arc_direction": "dark_to_light",
  "scenes": [
    { "n":1, "function":"setup", "connector":null, "stake":1,
      "tod":"night", "location":"kos", "dur":5.5, "vo":"...", "visual":"..." },
    { "n":7, "function":"turn", "connector":"BUT", "stake":5, ... } ] }
```

## The laws

- **S1 — "AND THEN" does not exist.** Every scene after the first declares **BUT** (the situation
  resists) or **THEREFORE** (the last scene caused this one). There is no AND. The signature AI story
  is a list: things happen, then other things happen, for no reason.
  **[HUMAN] the swap probe:** swap any two adjacent scenes. If nothing breaks, it was never a story —
  it was b-roll with narration. Cut one.
- **S2 — the WANT has a number in it.** *"She wants to get her finances under control"* is a THEME,
  and themes cannot be filmed. *"He needs Rp 1.2 juta for the kos deposit by Friday"* is a want.
  **[HUMAN]** pause scene 1, sound off: can a stranger say what this person wants? If the want isn't
  VISIBLE (the torn notice, the labelled empty jar), the plate is wrong — not the viewer.
- **S3 — escalation is a number the build checks.** Each scene carries an integer `stake`. It is
  non-decreasing, and rises at least **twice** before the turn. A flat stake line is a montage, and
  montages fail the build. The numbers are yours; once declared, the film must deliver the scene the
  number promised.
- **S4 — exactly one turn, landing at 55–75% of runtime.** Earlier and the back half is a sermon —
  the story ends and the video keeps talking. Later and the endcard crashes into the emotion. (The ad
  turns at 52%; an ad resolves faster than a story. A story needs the pressure to cook longer.)
- **S6 — the turn is measurable in the FRAME, not just the script.** Mean luminance of post-turn
  scenes must differ from pre-turn by **≥0.10** in the declared direction. A story where the turn
  happens only in the voiceover has not turned. Also asserted: any plate declared `tod: night` must
  measure darker than every `tod: day` plate — **codex WILL drift time-of-day between parallel
  sessions if nothing checks it.**
- **S7 — pacing accelerates into the turn; the turn gets the longest hold.** Escalation durations are
  non-increasing. The longest shot in the film is the turn or the shot right after it. Shot-duration
  coefficient of variation ≥ 0.25 — **uniform pacing fails even if everything else passes.** An
  isochronous edit is the rhythm of a screensaver.
- **S8 — hold on a decision, cut on information.** Hold when something is CHANGING that the viewer
  must read (a face deciding, a hand hesitating). Cut the instant new information arrives. A hold on
  scenery is the AI-b-roll tell: dead air wearing a nice grade.
  Max single-clip hold = **6.04s** (grok's verified-clean window). Longer needs the **two-plate
  hold**: two plates of the SAME moment from different angles, cut together — a cut that does not
  advance time.
- **S9 — one character sheet, generated FIRST, attached to every session.** Himel is optional here,
  but the failure his four refs solved does not go away: parallel codex sessions each invent their
  own person. A protagonist whose shirt changes colour at scene 4 ends the story — the viewer exits
  the fiction to debug the film.
- **S10 — the ending is SHOWN, never stated.** The most reliable AI-story failure is the last line
  explaining what we just watched ("dan hari itu gue sadar…"). **If the film worked, the moral is
  redundant. If it didn't, the moral is a confession.** Default ending is the **bookend**: return to
  scene 1's location with exactly ONE visible element changed.
- **S11 — the protagonist acts, and the app never rescues.** The TURN must be the protagonist's own
  decision, performed on camera. The product may appear in `resolution` and endcard **only**. Every
  claim checked against `references/ibils-app.md` — WhatsApp receipt logging is real; **email
  forwarding is NOT shipped.**

## Voice leads — the inversion

```
AD      (picture-first): script → plates → animate → cut to BEAT GRID → score fitted to picture
STORY   (voice-first):   script → RECORD → align → timeline.json FROM the voice
                                → plates for shots whose durations are now KNOWN
                                → animate → assemble ON the voice → music ducked underneath
```

In the ad, shot durations are **decided** and everything conforms. In a voiced piece they are
**discovered** from the performance. That is why plates come *after* recording: you cannot brief grok
for a 3.1s hold before you know the line runs 3.1s.

**The order is the law: words → voice → time → pictures.** The ad already taught us what happens when
time is guessed and filled afterwards ("ga smooth" — 64% synthesised frames). Doing that to a VOICE is
worse: speech rhythm is the one instrument every viewer has played since birth.

```bash
node runtime/voice/voice.mjs synth  script.json --out work/    # AI scratch track
node runtime/voice/voice.mjs ingest script.json --takes takes/ # human, one file per line
node runtime/voice/voice.mjs verify work/timing.json           # did they read the approved copy?
```

**The recording protocol IS the alignment strategy.** One audio file per numbered line. Timing is
per-file duration — no ASR needed to *cut*, and a retake replaces exactly one file.

**Cuts land in pauses, never mid-word.** A cut inside a word is the single most amateur defect a
voiced edit can have.

**Music under voice: arrangement, not amplitude.** Ducking is polish, not a plan — sidechain on a busy
cue carves an audible pumping hole. Pick a cue with no lead melody in the speech band (~300Hz–3kHz);
pads and low pulse coexist with a voice, a piano melody fights it and both lose. Then the music
**exits** for the beats that carry the piece. Tempo-lock inverts: the cuts belong to the voice and do
not move for the score — the cue's start *offset* is the free variable.

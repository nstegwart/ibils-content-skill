# SURFACE ROUTING — which account, which language, which handle

**One table. Every generator reads it. Nothing hardcodes a handle again.**

This file exists because 48 of the 64 English slides in the first batch were rendered with
`@ibils.savy` stamped on them. The handle was a string literal in `gen-carousel.js` and in
`references/styles.md`, and the skill had no concept of a *surface* at all — so it could not possibly
have got this right, and would have got it wrong again on the next run.

| surface | language / register | handle | logo card |
|---|---|---|---|
| **Carousel** — global IG | **English** | **`@ibils.global`** | **Deep green `#0E3B33`** `ibils-logo-card-global.png` (Figma Logo Global) |
| **Reels** — global IG | **English** | **`@ibils.global`** | same deep green |
| **Indonesian content** | Bahasa Indonesia, Jakarta Gen-Z (`lo/gue`) | **NONE — no handle at all** | Deep green primary (same mark). Teal backup: `ibils-logo-card-id-teal.png` via `CAROUSEL_LOGO=teal` |
| **Paid video ads** | Bahasa Indonesia (`lo/gue`) | **NONE** — the ad points at the landing page. No handle, **no store badges**. | app teal splash ok |

### Logo law (owner 2026-07-16)

- **One mark** (white iB hex). **Deep green `#0E3B33`** is the assigned carousel logo for **all** carousels unless overridden.
- `finalize.js` resolves via `CAROUSEL_LOGO=global|teal|path` or defaults to deep green `ibils-logo-card.png`.
- Do **not** invent a second brand color system for global vs indo — only thin surface differences (handle, language, content register).

### Global content register (owner 2026-07-16)

- Voice = **friend retelling** (YouTube podcast energy): spoken, blunt, concrete receipts — **not** AI staccato closings.
- **Angle = EXPERIENCE position always** — lived scene + wrong belief (gold **5702 · 5703 · 5704 · 5708**). Not lecture titles. Full law: `writing-global-en.md`.
- English surface: you + contractions; Indonesian surface: lo/gue. Same spine: product + wrong belief + mechanism.
- Closings = 2–5 words **this story only**. Ban empty pairs like `WAKTU KURANG` → **`WAKTU BERKURANG`** (`id-collocation-ban.json`).

## The law

- A footer handle is **derived from the surface**, never typed into a prompt.
- **English content → `@ibils.global`.** (Owner, 2026-07-14.)
- **Indonesian content → NO handle.** Do not stamp `@ibils.savy` on it. (Owner, 2026-07-14.)
- A surface whose handle is `NONE` renders **no footer handle whatsoever** — not an empty string, not
  a placeholder. The slide number still goes bottom-right.
- **Comedy is Bahasa Indonesia. Story is English.** (Owner, 2026-07-14.) A joke does not survive
  translation — the timing lives in the particles (`sih`, `dong`, `deh`) and there is no English
  equivalent. A story is universal, so it goes to the global account.
- **STORY goes to Reels on @ibils.global. COMEDY does NOT** — Reels is the global English surface, and
  a lo/gue joke has no business there. Comedy ships to an Indonesian surface and, per the rule above,
  **carries no handle at all**, so no account name is needed at generation time. Where it is posted is
  a distribution decision, not a content one.
- If a new surface appears, it gets a row HERE first. A generator that needs a handle and cannot find
  its surface in this table must **fail**, not guess.

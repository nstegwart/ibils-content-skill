# SURFACE ROUTING — which account, which language, which handle

**One table. Every generator reads it. Nothing hardcodes a handle again.**

This file exists because 48 of the 64 English slides in the first batch were rendered with
`@ibils.savy` stamped on them. The handle was a string literal in `gen-carousel.js` and in
`references/styles.md`, and the skill had no concept of a *surface* at all — so it could not possibly
have got this right, and would have got it wrong again on the next run.

| surface | language / register | handle |
|---|---|---|
| **Carousel** — global IG | **English** | **`@ibils.global`** |
| **Reels** — global IG | **English** | **`@ibils.global`** |
| **Indonesian content** | Bahasa Indonesia, Jakarta Gen-Z (`lo/gue`) | **NONE — no handle at all** |
| **Paid video ads** | Bahasa Indonesia (`lo/gue`) | **NONE** — the ad points at the landing page. No handle, **no store badges**. |

## The law

- A footer handle is **derived from the surface**, never typed into a prompt.
- **English content → `@ibils.global`.** (Owner, 2026-07-14.)
- **Indonesian content → NO handle.** Do not stamp `@ibils.savy` on it. (Owner, 2026-07-14.)
- A surface whose handle is `NONE` renders **no footer handle whatsoever** — not an empty string, not
  a placeholder. The slide number still goes bottom-right.
- If a new surface appears, it gets a row HERE first. A generator that needs a handle and cannot find
  its surface in this table must **fail**, not guess.

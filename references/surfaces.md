# SURFACE ROUTING — which account, which language, which handle

**One table. Every generator reads it. Nothing hardcodes a handle again.**

This file exists because 48 of the 64 English slides in the first batch were rendered with
`@ibils.savy` stamped on them. `@ibils.savy` is not the English account. The handle was a string
literal in `gen-carousel.js` and in `references/styles.md`, and the skill had no concept of a surface
at all — so it could not possibly have got this right.

| surface | language / register | IG handle |
|---|---|---|
| **Carousel** (global IG) | **English** | **`@ibils.global`** |
| **Reels** (global IG) | **English** | **`@ibils.global`** |
| **Paid video ads** | **Bahasa Indonesia**, Jakarta Gen-Z (`lo/gue`) | *(no handle — the ad points at the landing page, and carries no store badges)* |
| `@ibils.savy` | — | **NOT the English account. Do not stamp it on English content.** |

## The law

- A slide's footer handle is **derived from its surface**, never typed into a prompt.
- Owner-set, 2026-07-14: **English content posts to `@ibils.global`.**
- If a new surface appears, it gets a row HERE first. A generator that needs a handle and cannot find
  its surface in this table must **fail**, not guess.

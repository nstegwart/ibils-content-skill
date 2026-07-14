#!/usr/bin/env node
/**
 * Fetch the latest, most actual Indonesian finance news from valid sources.
 * Zero npm dependencies — uses fetch + a small regex RSS parser.
 *
 * Source: Google News RSS. Global English finance news by default (NEWS_LOCALE=id for Indonesian
 * market sources). Every item carries a real
 * publisher name, link, and publish date — these become the cited sources.
 *
 * Usage:
 *   node news.js --topic "rupiah melemah" --limit 6
 *   node news.js --limit 8
 * Output: JSON array on stdout — [{title, link, source, publishedAt, snippet}]
 * Exit 1 (HARD STOP) if no source can be reached — never fabricate.
 */

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const TOPIC = arg("--topic", "");
const LIMIT = Number(arg("--limit", "6")) || 6;
const TIMEOUT_MS = 9000;

// WHICH STORIES WE READ.
// The carousel now ships in ENGLISH for a global IG account, so the default sources are global
// English finance news. Ibils is an Indonesian product, though, so Indonesian market news is still
// a legitimate feed — set NEWS_LOCALE=id for it. The COPY is written in English either way; this
// only chooses what we read.
const ID_MODE = process.env.NEWS_LOCALE === "id";
const LOCALE = ID_MODE ? "&hl=id&gl=ID&ceid=ID:id" : "&hl=en-US&gl=US&ceid=US:en";

const Q = ID_MODE
  ? {
      market: 'keuangan OR rupiah OR inflasi OR "Bank Indonesia" Indonesia when:7d',
      personal: "keuangan pribadi OR budgeting OR menabung Indonesia when:14d",
      topic: (t) => `${t} keuangan Indonesia dampak masyarakat when:7d`,
      marketName: "Google News — Keuangan Indonesia",
      personalName: "Google News — Keuangan Pribadi",
    }
  : {
      market: 'inflation OR "interest rates" OR "cost of living" OR "central bank" when:7d',
      personal: "personal finance OR budgeting OR saving money OR overspending when:14d",
      topic: (t) => `${t} personal finance impact when:7d`,
      marketName: "Google News — Money & Markets",
      personalName: "Google News — Personal Finance",
    };

// Recency-first finance feeds. A topic, when given, leads the list.
function feeds() {
  const list = [
    {
      name: Q.marketName,
      url: "https://news.google.com/rss/search?q=" + encodeURIComponent(Q.market) + LOCALE
    },
    {
      name: Q.personalName,
      url: "https://news.google.com/rss/search?q=" + encodeURIComponent(Q.personal) + LOCALE
    }
  ];
  if (TOPIC) {
    list.unshift({
      name: `Google News — ${TOPIC}`,
      url: "https://news.google.com/rss/search?q=" + encodeURIComponent(Q.topic(TOPIC)) + LOCALE
    });
  }
  return list;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function stripHtml(s) {
  let out = String(s).replace(/<!\[CDATA\[|\]\]>/g, "");
  // RSS descriptions are often double-encoded — decode then strip twice.
  for (let i = 0; i < 2; i++) {
    out = decodeEntities(out).replace(/<[^>]+>/g, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? stripHtml(m[1]) : "";
}

async function fetchFeed(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Ibils-Carousel/1.0 (finance news RSS)" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const items = [];
  const failures = [];
  for (const feed of feeds()) {
    try {
      const xml = await fetchFeed(feed.url);
      const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
      for (const b of blocks) {
        const title = tag(b, "title");
        const link = tag(b, "link");
        if (!title || !link) continue;
        items.push({
          title,
          link,
          source: feed.name,
          publishedAt: tag(b, "pubDate"),
          snippet: tag(b, "description")
        });
      }
    } catch (e) {
      failures.push(`${feed.name}: ${e.message}`);
    }
  }

  // dedupe by link
  const seen = new Set();
  const unique = items.filter((it) => {
    if (seen.has(it.link)) return false;
    seen.add(it.link);
    return true;
  });

  if (!unique.length) {
    // HARD STOP — a valid source could not be reached. Do NOT fabricate news.
    console.error(
      "GAGAL: tidak ada sumber news yang bisa diakses. " +
        (failures.join(" | ") || "feed kosong") +
        "\nJANGAN buat konten news dari tebakan. Stop, lapor user, tawarkan mode manual."
    );
    process.exit(1);
  }

  // newest first when a parseable date exists
  unique.sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });

  process.stdout.write(JSON.stringify(unique.slice(0, LIMIT), null, 2) + "\n");
}

main().catch((e) => {
  console.error("GAGAL fetch news:", e.message);
  process.exit(1);
});

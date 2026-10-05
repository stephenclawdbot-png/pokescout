#!/usr/bin/env node
// Daily market ingest for the PokéScout terminal.
//
// Universe + USD:  pokemontcg.io (every English card, TCGplayer market prices, refreshed daily)
// EUR momentum:    TCGdex (Cardmarket avg1 / avg7 / avg30 / trend, refreshed daily)
// History:         our own daily USD snapshot per card, appended to public/data/history/<set>.json
//
// Writes public/data/market.json. Never overwrites a good dataset with a partial one:
// if the pokemontcg.io pull comes back short, the script exits non-zero and leaves files alone.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public", "data");
const HIST = path.join(OUT, "history");
const HISTORY_DAYS = 400;
const CM_MAX_AGE_DAYS = 7;
const UA = "pokescout-ingest/1.0 (+https://github.com/stephenclawdbot-png/pokescout)";
const PTCG_KEY = process.env.POKEMONTCG_API_KEY;
const SKIP_TCGDEX = process.env.SKIP_TCGDEX === "1";

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, { tries = 7, headers = {}, timeout = 90_000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(timeout) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      last = err;
      await sleep(Math.min(30_000, 1000 * 1.8 ** i) + Math.random() * 500);
    }
  }
  throw new Error(`${url}: ${last?.message ?? last}`);
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })
  );
  return out;
}

const r2 = (n) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);
const pos = (n) => (typeof n === "number" && n > 0 ? n : null);
const normName = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const normNum = (s) => {
  const t = String(s).trim().toLowerCase();
  return /^\d+$/.test(t) ? String(parseInt(t, 10)) : t.replace(/^([a-z]+)0+(\d)/, "$1$2");
};

// ---------- pokemontcg.io ----------

const PTCG = "https://api.pokemontcg.io/v2";
const ptcgHeaders = PTCG_KEY ? { "X-Api-Key": PTCG_KEY } : {};

async function ptcgSets() {
  const d = await getJson(`${PTCG}/sets?pageSize=250&orderBy=releaseDate`, { headers: ptcgHeaders });
  return d.data;
}

// pokemontcg.io throws random 500/502s, more often on big pages. Retry, and if a page keeps
// failing, split it into five smaller pages covering the same rows (250 → 50 → 10).
async function ptcgPage(page, size) {
  const select = "id,name,supertype,subtypes,number,rarity,set,images,tcgplayer,nationalPokedexNumbers,artist";
  const url = `${PTCG}/cards?page=${page}&pageSize=${size}&orderBy=id&select=${select}`;
  try {
    return await getJson(url, { headers: ptcgHeaders, tries: size > 10 ? 4 : 10 });
  } catch (err) {
    if (size <= 10) throw err;
    const sub = size / 5;
    const parts = [];
    for (let i = 1; i <= 5; i++) parts.push(await ptcgPage((page - 1) * 5 + i, sub));
    return { totalCount: parts[0].totalCount, data: parts.flatMap((p) => p.data) };
  }
}

async function ptcgCards() {
  const pageSize = 250;
  const first = await ptcgPage(1, pageSize);
  const total = first.totalCount;
  const pages = Math.ceil(total / pageSize);
  log(`pokemontcg.io: ${total} cards over ${pages} pages`);
  const rest = await pool(
    Array.from({ length: pages - 1 }, (_, i) => i + 2),
    3,
    async (p) => {
      const d = await ptcgPage(p, pageSize);
      if (p % 10 === 0) log(`  page ${p}/${pages}`);
      return d.data;
    }
  );
  const byId = new Map();
  for (const c of [first.data, ...rest].flat()) byId.set(c.id, c);
  if (byId.size < total * 0.98) throw new Error(`pokemontcg.io returned ${byId.size}/${total} cards, refusing to publish partial data`);
  return [...byId.values()];
}

// Which TCGplayer printing represents "the card". Unlimited beats 1st edition (more liquid),
// holo beats reverse (reverse is a parallel, not the base card).
const VARIANT_ORDER = ["holofoil", "normal", "unlimitedHolofoil", "unlimited", "1stEditionHolofoil", "1stEditionNormal", "1stEdition", "reverseHolofoil"];
const VARIANT_CODE = { holofoil: "H", normal: "N", unlimitedHolofoil: "UH", unlimited: "U", "1stEditionHolofoil": "1H", "1stEditionNormal": "1N", "1stEdition": "1", reverseHolofoil: "R" };

function pickUsd(tcg) {
  const prices = tcg?.prices;
  if (!prices) return null;
  const keys = [...VARIANT_ORDER.filter((k) => prices[k]), ...Object.keys(prices).filter((k) => !VARIANT_ORDER.includes(k))];
  for (const k of keys) {
    const p = prices[k];
    const v = pos(p?.market) ?? pos(p?.mid);
    if (v) return { variant: VARIANT_CODE[k] ?? k, market: v, low: pos(p.low) };
  }
  return null;
}

// ---------- TCGdex ----------

const TCGDEX = "https://api.tcgdex.net/v2/en";

async function tcgdexSets() {
  const list = await getJson(`${TCGDEX}/sets`);
  const detail = await pool(list, 12, (s) => getJson(`${TCGDEX}/sets/${encodeURIComponent(s.id)}`).catch(() => null));
  return detail.filter(Boolean).filter((s) => s.serie?.id !== "tcgp"); // TCG Pocket is digital-only
}

function matchSets(ptcg, dex) {
  const byName = new Map();
  for (const s of ptcg) {
    const k = normName(s.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  const map = new Map(); // tcgdex set id -> ptcg set id
  for (const d of dex) {
    const cands = byName.get(normName(d.name));
    if (!cands?.length) continue;
    const dDate = d.releaseDate ? Date.parse(d.releaseDate) : NaN;
    const best = cands
      .map((s) => ({ s, gap: Number.isFinite(dDate) ? Math.abs(Date.parse(s.releaseDate.replaceAll("/", "-")) - dDate) : 0 }))
      .sort((a, b) => a.gap - b.gap)[0];
    if (best.gap > 120 * 86400_000) continue;
    map.set(d.id, best.s.id);
  }
  return map;
}

function cmBlock(cm, now) {
  if (!cm || !cm.updated) return null;
  if (now - Date.parse(cm.updated) > CM_MAX_AGE_DAYS * 86400_000) return null;
  const b = { trend: pos(cm.trend), avg1: pos(cm.avg1), avg7: pos(cm.avg7), avg30: pos(cm.avg30), low: pos(cm.low) };
  if (!b.avg30 && !b.trend) {
    // Reverse-only printings carry their prices in the -holo fields.
    const h = { trend: pos(cm["trend-holo"]), avg1: pos(cm["avg1-holo"]), avg7: pos(cm["avg7-holo"]), avg30: pos(cm["avg30-holo"]), low: pos(cm["low-holo"]) };
    if (!h.avg30 && !h.trend) return null;
    return h;
  }
  return b;
}

async function tcgdexCardmarket(ptcgSetsList, ptcgCardsList) {
  const now = Date.now();
  const dexSets = await tcgdexSets();
  const setMap = matchSets(ptcgSetsList, dexSets);
  log(`TCGdex: ${dexSets.length} physical sets, ${setMap.size} matched to pokemontcg.io`);

  const ptcgKey = new Map(ptcgCardsList.map((c) => [`${c.set.id}|${normNum(c.number)}`, c.id]));
  const jobs = [];
  for (const s of dexSets) {
    const target = setMap.get(s.id);
    if (!target) continue;
    for (const c of s.cards ?? []) {
      const pid = ptcgKey.get(`${target}|${normNum(c.localId)}`);
      if (pid) jobs.push({ dexId: c.id, pid });
    }
  }
  log(`TCGdex: fetching ${jobs.length} card price blocks`);
  const out = new Map();
  let done = 0;
  await pool(jobs, 16, async (j) => {
    const card = await getJson(`${TCGDEX}/cards/${encodeURIComponent(j.dexId)}`, { tries: 4, timeout: 30_000 }).catch(() => null);
    const b = cmBlock(card?.pricing?.cardmarket, now);
    if (b) out.set(j.pid, b);
    if (++done % 2000 === 0) log(`  ${done}/${jobs.length}`);
  });
  log(`TCGdex: ${out.size} cards with fresh Cardmarket data`);
  return out;
}

// ---------- FX ----------

async function eurUsd(prev) {
  try {
    const d = await getJson("https://open.er-api.com/v6/latest/EUR", { tries: 3 });
    if (d?.rates?.USD) return d.rates.USD;
  } catch {}
  return prev ?? 1.1;
}

// ---------- history ----------

function changeOver(dates, series, todayIdx, days, slack) {
  const today = series[todayIdx];
  if (!today) return null;
  // Use the snapshot closest to exactly `days` ago, within ±slack days.
  const t = Date.parse(dates[todayIdx]);
  let best = null;
  let bestGap = Infinity;
  for (let i = todayIdx - 1; i >= 0; i--) {
    const age = (t - Date.parse(dates[i])) / 86400_000;
    if (age > days + slack) break;
    const gap = Math.abs(age - days);
    if (gap <= slack && series[i] && gap < bestGap) {
      best = series[i];
      bestGap = gap;
    }
  }
  return best ? r2((today / best - 1) * 100) : null;
}

async function updateHistory(setId, today, prices) {
  const file = path.join(HIST, `${setId}.json`);
  let h = { dates: [], prices: {} };
  if (existsSync(file)) {
    try { h = JSON.parse(await readFile(file, "utf8")); } catch {}
  }
  let idx = h.dates.indexOf(today);
  if (idx === -1) {
    h.dates.push(today);
    idx = h.dates.length - 1;
  }
  const n = h.dates.length;
  for (const [id, v] of Object.entries(prices)) {
    const s = h.prices[id] ?? [];
    while (s.length < n) s.push(null);
    s[idx] = v;
    h.prices[id] = s;
  }
  for (const s of Object.values(h.prices)) while (s.length < n) s.push(null);
  if (n > HISTORY_DAYS) {
    const cut = n - HISTORY_DAYS;
    h.dates = h.dates.slice(cut);
    for (const k of Object.keys(h.prices)) h.prices[k] = h.prices[k].slice(cut);
    idx -= cut;
  }
  await writeFile(file, JSON.stringify(h));
  const changes = {};
  for (const id of Object.keys(prices)) {
    const s = h.prices[id];
    changes[id] = [changeOver(h.dates, s, idx, 1, 1.5), changeOver(h.dates, s, idx, 7, 2), changeOver(h.dates, s, idx, 30, 4)];
  }
  return { changes, days: h.dates.length };
}

// ---------- main ----------

async function main() {
  await mkdir(HIST, { recursive: true });
  const prevFile = path.join(OUT, "market.json");
  const prev = existsSync(prevFile) ? JSON.parse(await readFile(prevFile, "utf8")) : null;

  log("pokemontcg.io sets…");
  const sets = (await ptcgSets()).filter((s) => s.total > 0);
  log(`${sets.length} sets`);
  const cards = await ptcgCards();

  let cm = new Map();
  if (!SKIP_TCGDEX) {
    try {
      cm = await tcgdexCardmarket(sets, cards);
    } catch (err) {
      log(`TCGdex failed, publishing without EUR momentum: ${err.message}`);
    }
  }
  const fx = await eurUsd(prev?.fx?.eurUsd);

  const today = new Date().toISOString().slice(0, 10);
  const setIdx = new Map(sets.map((s, i) => [s.id, i]));
  const bySet = new Map();
  for (const c of cards) {
    if (!setIdx.has(c.set.id)) continue;
    if (!bySet.has(c.set.id)) bySet.set(c.set.id, []);
    bySet.get(c.set.id).push(c);
  }

  const rows = [];
  let historyDays = 0;
  for (const [setId, list] of bySet) {
    const usd = new Map(list.map((c) => [c.id, pickUsd(c.tcgplayer)]));
    const snap = {};
    for (const [id, u] of usd) if (u) snap[id] = u.market;
    const { changes, days } = await updateHistory(setId, today, snap);
    historyDays = Math.max(historyDays, days);
    for (const c of list) {
      const u = usd.get(c.id);
      const e = cm.get(c.id);
      const ch = changes[c.id] ?? [null, null, null];
      const img = c.images?.small?.replace("https://images.pokemontcg.io/", "") ?? "";
      rows.push([
        c.id,
        c.name,
        setIdx.get(setId),
        c.number,
        c.rarity ?? "",
        (c.supertype ?? "?")[0],
        img,
        r2(u?.market),
        r2(u?.low),
        u?.variant ?? "",
        r2(e?.trend),
        r2(e?.avg1),
        r2(e?.avg7),
        r2(e?.avg30),
        r2(e?.low),
        ch[0],
        ch[1],
        ch[2],
        c.nationalPokedexNumbers?.[0] ?? 0,
        c.artist ?? "",
      ]);
    }
  }

  const market = {
    generatedAt: new Date().toISOString(),
    asOf: today,
    historyDays,
    fx: { eurUsd: Math.round(fx * 10000) / 10000 },
    sources: {
      usd: "TCGplayer market price via pokemontcg.io (daily)",
      eur: "Cardmarket avg1/avg7/avg30/trend via TCGdex (daily, only blocks updated within 7 days)",
      history: "PokéScout daily USD snapshots",
    },
    sets: sets.map((s) => [s.id, s.name, s.series, s.releaseDate.replaceAll("/", "-"), s.printedTotal, s.total, s.images?.symbol ?? "", s.images?.logo ?? ""]),
    cols: ["id", "name", "set", "number", "rarity", "supertype", "img", "usd", "usdLow", "variant", "eurTrend", "eurAvg1", "eurAvg7", "eurAvg30", "eurLow", "usd1d", "usd7d", "usd30d", "dex", "artist"],
    rows,
  };
  await writeFile(prevFile, JSON.stringify(market));
  const priced = rows.filter((r) => r[7] != null).length;
  log(`wrote ${rows.length} cards (${priced} USD-priced, ${cm.size} with EUR momentum), ${historyDays} day(s) of history`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

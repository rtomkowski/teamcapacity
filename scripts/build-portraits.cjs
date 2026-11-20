// MIT License, Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>. See LICENSE.
// Draws the fictional, illustrated portraits for the demo team (v38) and saves them as JPEG.
// Run with Node and Playwright: node scripts/build-portraits.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const demo = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/demo-ee.json"), "utf8"));
const SKIN = ["#f6d7c3", "#eec1a2", "#e0a882", "#c98e66", "#a86f4c", "#8a5638", "#6b402a", "#f1c9a8"];
const HAIR = ["#2b2220", "#4a3428", "#7a5232", "#b3874f", "#d9b77a", "#8f8f8f", "#1c1c24", "#5e2f22"];
const BG = ["#dbe7fb", "#fde4d6", "#d9f2e6", "#fbefc9", "#f6dbe7", "#e4e0fa", "#d5eef2", "#ece6dc"];
const SHIRT = ["#3e5bd8", "#1baf7a", "#eb6834", "#6250d6", "#2a78d6", "#e87ba4", "#4a4f5a", "#c98500"];
const STYLES = ["short", "long", "bun", "curly", "bob", "side", "pony", "buzz"];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// v39: each fictional person's look is chosen by hand, so it fits the name.
// [hair style, skin, hair colour, glasses, beard]
const LOOK = {
  "Helena Strand": ["bob", 0, 5, true, false],
  "Marek Nowak": ["short", 7, 1, true, true],
  "Sofia Lind": ["long", 0, 4, false, false],
  "Anders Holm": ["side", 1, 3, false, true],
  "Priya Raman": ["long", 4, 6, false, false],
  "Lucas Moreau": ["curly", 2, 2, false, false],
  "Yuki Tanaka": ["bob", 7, 6, false, false],
  "Karin Ek": ["bun", 1, 3, false, false],
  "Oskar Berg": ["short", 0, 4, false, true],
  "Nadia Haddad": ["curlylong", 3, 0, false, false],
  "Emil Sjoberg": ["side", 0, 2, false, false],
  "Ines Carvalho": ["pony", 2, 1, false, false],
  "David Okafor": ["buzz", 6, 6, false, false],
  "Johanna Falk": ["pony", 0, 3, false, false],
  "Viktor Lund": ["short", 1, 4, true, false],
  "Mei Chen": ["long", 7, 6, true, false],
  "Rasmus Dahl": ["curly", 0, 7, false, true],
  "Elsa Norberg": ["bun", 0, 4, false, false],
  "Filip Aho": ["short", 1, 3, false, false],
  "Leila Karimi": ["long", 3, 0, false, false],
  "Tomasz Wierzbicki": ["side", 1, 5, true, true],
  "Ana Ruiz": ["curlylong", 2, 1, false, false],
  "Jonas Weber": ["buzz", 1, 2, false, false],
  "Aiko Mori": ["pony", 7, 6, false, false],
};

const EARRINGS = new Set(["Helena Strand", "Karin Ek", "Ines Carvalho", "Johanna Falk", "Aiko Mori", "Elsa Norberg", "Yuki Tanaka", "Mei Chen", "Priya Raman"]);

function portrait(name, i) {
  const h = hash(name);
  const look = LOOK[name] || [STYLES[i % STYLES.length], (h >>> 3) % SKIN.length, (h >>> 7) % HAIR.length, false, false];
  const [style, skinI, hairI, glasses, beard] = look;
  const skin = SKIN[skinI];
  const hair = HAIR[hairI];
  const bg = BG[i % BG.length];
  const shirt = SHIRT[(i * 3 + 1) % SHIRT.length];
  const back = {
    long: `<path d="M58 70 Q56 40 96 36 Q136 40 134 70 L142 156 Q96 166 50 156 Z" fill="${hair}"/>`,
    curlylong: [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${60 + (k % 2) * 72}" cy="${86 + Math.floor(k / 2) * 24}" r="16" fill="${hair}"/>`).join("") + `<path d="M58 70 Q56 40 96 36 Q136 40 134 70 L140 140 Q96 150 52 140 Z" fill="${hair}"/>`,
    bob: `<path d="M56 74 Q56 36 96 34 Q136 36 136 74 L136 118 Q96 126 56 118 Z" fill="${hair}"/>`,
    pony: `<path d="M128 70 Q150 92 140 140 Q132 120 124 96 Z" fill="${hair}"/>`,
    bun: `<circle cx="96" cy="30" r="17" fill="${hair}"/>`,
  }[style] || "";
  const front = {
    short: `<path d="M62 78 Q60 40 96 38 Q132 40 130 78 Q124 58 96 56 Q70 58 62 78 Z" fill="${hair}"/>`,
    long: `<path d="M62 84 Q62 42 96 40 Q130 42 130 84 Q118 58 96 56 Q74 60 62 84 Z" fill="${hair}"/>`,
    bun: `<path d="M62 78 Q62 42 96 40 Q130 42 130 78 Q120 58 96 56 Q72 58 62 78 Z" fill="${hair}"/>`,
    curly: [0, 1, 2, 3, 4, 5, 6].map((k) => `<circle cx="${64 + k * 10.7}" cy="${52 - Math.sin((k / 6) * Math.PI) * 12}" r="12" fill="${hair}"/>`).join("") + `<circle cx="62" cy="70" r="9" fill="${hair}"/><circle cx="130" cy="70" r="9" fill="${hair}"/>`,
    bob: `<path d="M62 80 Q64 42 96 40 Q128 42 130 80 Q112 62 86 58 Q70 62 62 80 Z" fill="${hair}"/>`,
    side: `<path d="M62 80 Q60 40 98 38 Q134 42 130 74 Q110 52 70 66 Z" fill="${hair}"/>`,
    pony: `<path d="M60 92 Q58 42 96 40 Q132 42 132 92 Q128 66 120 60 Q96 54 72 60 Q64 66 60 92 Z" fill="${hair}"/>`,
    curlylong: [0, 1, 2, 3, 4, 5, 6].map((k) => `<circle cx="${64 + k * 10.7}" cy="${52 - Math.sin((k / 6) * Math.PI) * 12}" r="12" fill="${hair}"/>`).join(""),
    buzz: `<path d="M64 72 Q64 44 96 42 Q128 44 128 72 Q118 56 96 54 Q74 56 64 72 Z" fill="${hair}" opacity="0.85"/>`,
  }[style];
  const beardSvg = beard ? `<path d="M70 96 Q72 130 96 134 Q120 130 122 96 Q116 116 96 118 Q76 116 70 96 Z" fill="${hair}" opacity="0.9"/>` : "";
  const glassesSvg = glasses
    ? `<g fill="none" stroke="#2b2b33" stroke-width="2.4"><circle cx="82" cy="88" r="9"/><circle cx="110" cy="88" r="9"/><path d="M91 88h10"/></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="${bg}"/>
  ${back}
  <path d="M40 192 Q42 150 96 146 Q150 150 152 192 Z" fill="${shirt}"/>
  <path d="M84 132 h24 v18 q-12 8 -24 0 Z" fill="${skin}"/>
  <path d="M84 146 q12 8 24 0 l4 4 q-16 10 -32 0 Z" fill="#000" opacity="0.08"/>
  <ellipse cx="64" cy="92" rx="6" ry="9" fill="${skin}"/><ellipse cx="128" cy="92" rx="6" ry="9" fill="${skin}"/>
  <ellipse cx="96" cy="88" rx="33" ry="40" fill="${skin}"/>
  ${beardSvg}
  ${front}
  <circle cx="83" cy="89" r="3.2" fill="#2b2b33"/><circle cx="109" cy="89" r="3.2" fill="#2b2b33"/>
  <path d="M78 79 q5 -3 10 0 M104 79 q5 -3 10 0" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M95 92 q-3 9 2 11" stroke="#000" stroke-opacity="0.18" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M86 111 q10 8 20 0" stroke="#7a3b30" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  <circle cx="74" cy="104" r="5" fill="#e8806a" opacity="0.18"/><circle cx="118" cy="104" r="5" fill="#e8806a" opacity="0.18"/>
  ${glassesSvg}
  ${EARRINGS.has(name) ? `<circle cx="64" cy="103" r="3.4" fill="#d4a017"/><circle cx="128" cy="103" r="3.4" fill="#d4a017"/>` : ""}
</svg>`;
}

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 200, height: 200 }, deviceScaleFactor: 1 });
  const out = path.join(__dirname, "../demo-data/portraits");
  fs.mkdirSync(out, { recursive: true });
  for (const [i, p] of demo.people.entries()) {
    await pg.setContent(`<body style="margin:0">${portrait(p.name, i)}</body>`);
    const file = path.join(out, p.name.toLowerCase().replace(/[^a-z]+/g, "-") + ".jpg");
    await pg.locator("svg").screenshot({ path: file, type: "jpeg", quality: 86 });
  }
  await b.close();
  console.log("portraits:", demo.people.length);
})();

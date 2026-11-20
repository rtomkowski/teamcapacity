/**
 * Editable PowerPoint slides of a person card: real text boxes, shapes and
 * tables (no picture), in the app's current colours. Long lists continue on
 * more slides. Built offline with pptxgenjs.
 */

export interface SlideChip {
  text: string;
  color: string;
}
export interface SlideRow {
  color: string;
  title: string;
  meta: string;
  chips: SlideChip[];
  groups: { name: string; color: string; done: number; items: { text: string; done: boolean }[] }[];
  note?: string;
  /** Milestones and deadlines of the project (v21). */
  points?: { kind: "milestone" | "deadline"; text: string; color: string; done: boolean }[];
  right: string;
  status: string;
  statusColor: string;
}
export interface SlideCard {
  name: string;
  role: string;
  photo?: string;
  ringColor: string;
  stats: { value: string; label: string; color: string }[];
  /** Capacity tracking on: heading line and bar segments. */
  capacity?: { line: string; parts: { label: string; hours: number; color: string }[]; total: number };
  status?: { label: string; note?: string; color: string };
  summary: string;
  filter?: string;
  rows: SlideRow[];
  caption: string;
}

const W = 13.333,
  H = 7.5,
  M = 0.35;
const FONT = "Calibri";
const hex = (c: string, fallback = "888888") => {
  const s = (c || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.slice(1).toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(s))
    return s
      .slice(1)
      .split("")
      .map((x) => x + x)
      .join("")
      .toUpperCase();
  const m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase();
  return fallback;
};
/** Theme colours read from the page, so the slides match light or dark. */
export function themeColours() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => hex(cs.getPropertyValue(n), f);
  return {
    canvas: v("--canvas", "F3F4F8"),
    surface: v("--surface", "FFFFFF"),
    surface2: v("--surface-secondary", "F4F5F9"),
    ink: v("--ink", "171923"),
    secondary: v("--secondary", "434757"),
    tertiary: v("--tertiary", "676C7E"),
    line: v("--line", "E1E3EA"),
    accent: v("--accent-fill", "3B6CF0"),
  };
}
export const cssColour = (name: string) => hex(getComputedStyle(document.documentElement).getPropertyValue(name));

/** Rough height of a row in inches, for splitting the list over slides. */
export function rowHeight(r: SlideRow): number {
  let h = 0.42; // title + meta
  if (r.chips.length) h += 0.2;
  if (r.note) h += 0.17;
  h += (r.points?.length ?? 0) * 0.17;
  for (const g of r.groups) h += 0.2 + g.items.length * 0.17;
  return (h + 0.08) * 0.92;
}
/** Splits rows into pages that fit `first` inches on the first slide and `rest` on the others. */
export function paginate(rows: SlideRow[], first: number, rest: number): SlideRow[][] {
  const pages: SlideRow[][] = [[]];
  let room = first;
  for (const r of rows) {
    const h = rowHeight(r);
    const page = pages[pages.length - 1];
    if (page.length && h > room) {
      pages.push([r]);
      room = rest - h;
    } else {
      page.push(r);
      room -= h;
    }
  }
  return pages;
}

export async function editableSlides(card: SlideCard): Promise<Blob> {
  const T = themeColours();
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = card.name;

  const leftW = 4.15,
    gap = 0.3,
    rightX = M + leftW + gap,
    rightW = W - rightX - M;
  const capH = 0.3;
  const listTop = M + 0.95;
  const pages = paginate(card.rows, H - listTop - M - capH - 0.15, H - listTop - M - capH - 0.15);

  pages.forEach((rows, pi) => {
    const s = pptx.addSlide();
    s.background = { color: T.canvas };

    // Left: the person card (first slide), a short header on the others.
    if (pi === 0) drawCard(s, card, T, M, M, leftW, H - 2 * M - capH);
    else {
      s.addText(card.name, { x: M, y: M, w: leftW, h: 0.45, fontFace: FONT, fontSize: 20, bold: true, color: T.ink });
      s.addText(`Assignments, continued (${pi + 1} of ${pages.length})`, {
        x: M,
        y: M + 0.45,
        w: leftW,
        h: 0.3,
        fontFace: FONT,
        fontSize: 11,
        color: T.tertiary,
      });
    }

    // Right: the assignments panel.
    const panelH = H - 2 * M - capH;
    s.addShape("roundRect", {
      x: rightX,
      y: M,
      w: rightW,
      h: panelH,
      fill: { color: T.surface },
      line: { color: T.line, width: 0.75 },
      rectRadius: 0.12,
    });
    s.addText("Assignments", { x: rightX + 0.2, y: M + 0.1, w: 4, h: 0.4, fontFace: FONT, fontSize: 18, bold: true, color: T.ink });
    s.addText([card.summary, card.filter].filter(Boolean).join(" · "), {
      x: rightX + 0.2,
      y: M + 0.48,
      w: rightW - 0.4,
      h: 0.3,
      fontFace: FONT,
      fontSize: 11,
      color: T.tertiary,
    });
    if (!rows.length) {
      s.addText("No projects assigned yet.", { x: rightX + 0.2, y: listTop, w: rightW - 0.4, h: 0.4, fontFace: FONT, fontSize: 12, color: T.tertiary });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = rows.map((r) => tableRow(r, T)) as any;
      s.addTable(body, {
        x: rightX + 0.12,
        y: listTop,
        w: rightW - 0.24,
        colW: [0.22, rightW - 0.24 - 0.22 - 1.45 - 1.05, 1.45, 1.05],
        fontFace: FONT,
        fontSize: 11,
        color: T.ink,
        valign: "top",
        border: [{ type: "none" }, { type: "none" }, { pt: 0.75, color: T.line }, { type: "none" }],
        margin: [0.05, 0.06, 0.05, 0.06],
      });
    }
    if (card.caption)
      s.addText(card.caption, {
        x: M,
        y: H - M - capH + 0.05,
        w: W - 2 * M,
        h: capH,
        fontFace: FONT,
        fontSize: 9,
        color: T.tertiary,
        align: "right",
      });
  });
  return (await pptx.write({ outputType: "blob" })) as Blob;
}

type T = ReturnType<typeof themeColours>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any;

function tableRow(r: SlideRow, T: T) {
  const runs: { text: string; options?: Record<string, unknown> }[] = [];
  const br = { breakLine: true };
  runs.push({ text: r.title, options: { bold: true, fontSize: 12.5, color: T.ink, ...br } });
  runs.push({ text: r.meta || " ", options: { fontSize: 10, color: T.tertiary, ...br } });
  if (r.chips.length) {
    r.chips.forEach((c, i) =>
      runs.push({
        text: `${c.text}${i < r.chips.length - 1 ? "   " : ""}`,
        options: { fontSize: 10, bold: true, color: c.color, ...(i === r.chips.length - 1 ? br : {}) },
      }),
    );
  }
  if (r.note) runs.push({ text: r.note, options: { fontSize: 10, italic: true, color: T.tertiary, ...br } });
  for (const pt of r.points ?? [])
    runs.push({
      text: `${pt.kind === "deadline" ? "⚑" : "◆"}  ${pt.text}`,
      options: { fontSize: 10, color: pt.done ? T.tertiary : pt.color, strike: pt.done ? "sngStrike" : undefined, ...br },
    });
  for (const g of r.groups) {
    runs.push({ text: `${g.name}  `, options: { fontSize: 10, bold: true, color: g.color } });
    runs.push({ text: `${g.done}/${g.items.length} done`, options: { fontSize: 9.5, color: T.tertiary, ...br } });
    g.items.forEach((it, i) =>
      runs.push({
        text: `${it.done ? "☑" : "☐"}  ${i + 1}. ${it.text}`,
        options: { fontSize: 10.5, color: it.done ? T.tertiary : T.secondary, strike: it.done ? "sngStrike" : undefined, ...br },
      }),
    );
  }
  // Drop the trailing line break so rows do not end with an empty line.
  const last = runs[runs.length - 1];
  if (last.options) delete last.options.breakLine;
  return [
    { text: "●", options: { color: r.color, fontSize: 12, align: "center" } },
    { text: runs },
    { text: r.right, options: { fontSize: 10, color: T.secondary, align: "right" } },
    { text: r.status, options: { fontSize: 10, bold: true, color: r.statusColor, align: "right" } },
  ];
}

function drawCard(s: Slide, card: SlideCard, T: T, x: number, y: number, w: number, h: number) {
  const pad = 0.22;
  // Height used by the card: header, stats, then capacity or status.
  let used = 1.45 + 0.95 + 0.2;
  if (card.capacity) used += 0.6 + Math.ceil(card.capacity.parts.length / 2) * 0.24;
  if (card.status) used += 0.7 + (card.status.note ? 0.4 : 0);
  const ch = Math.min(h, used + pad);
  s.addShape("roundRect", { x, y, w, h: ch, fill: { color: T.surface }, line: { color: card.ringColor, width: 1.25 }, rectRadius: 0.12 });
  const ph = 1.05;
  if (card.photo)
    s.addImage({ data: card.photo, x: x + pad, y: y + pad, w: ph, h: ph, rounding: true, altText: card.name });
  else {
    s.addShape("ellipse", { x: x + pad, y: y + pad, w: ph, h: ph, fill: { color: T.surface2 }, line: { color: card.ringColor, width: 2.5 } });
    s.addText(
      card.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      { x: x + pad, y: y + pad, w: ph, h: ph, align: "center", valign: "middle", fontFace: FONT, fontSize: 24, bold: true, color: T.secondary },
    );
  }
  if (card.photo)
    s.addShape("ellipse", { x: x + pad, y: y + pad, w: ph, h: ph, fill: { type: "none" } as unknown as { color: string }, line: { color: card.ringColor, width: 2.5 } });
  s.addText(card.name, { x: x + pad + ph + 0.15, y: y + pad + 0.2, w: w - ph - 2 * pad - 0.15, h: 0.4, fontFace: FONT, fontSize: 18, bold: true, color: T.ink });
  s.addText(card.role, { x: x + pad + ph + 0.15, y: y + pad + 0.58, w: w - ph - 2 * pad - 0.15, h: 0.3, fontFace: FONT, fontSize: 11.5, color: T.tertiary });

  // Stat boxes.
  let cy = y + pad + ph + 0.2;
  const n = card.stats.length || 1;
  const sg = 0.1,
    sw = (w - 2 * pad - (n - 1) * sg) / n;
  card.stats.forEach((st, i) => {
    const sx = x + pad + i * (sw + sg);
    s.addShape("roundRect", { x: sx, y: cy, w: sw, h: 0.8, fill: { color: T.surface2 }, line: { color: T.line, width: 0.75 }, rectRadius: 0.08 });
    s.addText(st.value, { x: sx + 0.08, y: cy + 0.05, w: sw - 0.16, h: 0.4, fontFace: FONT, fontSize: 20, bold: true, color: st.color });
    s.addText(st.label, { x: sx + 0.08, y: cy + 0.42, w: sw - 0.16, h: 0.32, fontFace: FONT, fontSize: 9.5, color: T.tertiary });
  });
  cy += 0.95;

  if (card.capacity) {
    const cap = card.capacity;
    s.addText(
      [
        { text: "CAPACITY", options: { bold: true, color: T.tertiary, charSpacing: 1 } },
        { text: `   ${cap.line}`, options: { color: T.ink, bold: true } },
      ],
      { x: x + pad, y: cy, w: w - 2 * pad, h: 0.28, fontFace: FONT, fontSize: 9.5 },
    );
    cy += 0.32;
    const bw = w - 2 * pad;
    let bx = x + pad;
    const total = Math.max(cap.total, 1);
    s.addShape("roundRect", { x: bx, y: cy, w: bw, h: 0.1, fill: { color: T.surface2 }, line: { type: "none" }, rectRadius: 0.05 });
    for (const part of cap.parts) {
      const pw = (part.hours / total) * bw;
      if (pw <= 0) continue;
      s.addShape("rect", { x: bx, y: cy, w: Math.max(pw - 0.02, 0.01), h: 0.1, fill: { color: part.color }, line: { type: "none" } });
      bx += pw;
    }
    cy += 0.22;
    const half = (w - 2 * pad) / 2;
    cap.parts.forEach((part, i) => {
      const px = x + pad + (i % 2) * half,
        py = cy + Math.floor(i / 2) * 0.24;
      s.addText(
        [
          { text: "■ ", options: { color: part.color } },
          { text: part.label, options: { color: T.secondary } },
          { text: `  ${part.hours} h`, options: { color: T.ink, bold: true } },
        ],
        { x: px, y: py, w: half, h: 0.24, fontFace: FONT, fontSize: 9.5 },
      );
    });
  }
  if (card.status) {
    s.addText(
      [
        { text: "● ", options: { color: card.status.color } },
        { text: card.status.label, options: { color: T.ink, bold: true } },
      ],
      { x: x + pad, y: cy, w: w - 2 * pad, h: 0.32, fontFace: FONT, fontSize: 12 },
    );
    if (card.status.note)
      s.addText(card.status.note, { x: x + pad, y: cy + 0.32, w: w - 2 * pad, h: 0.5, fontFace: FONT, fontSize: 10.5, italic: true, color: T.secondary, valign: "top" });
  }
}

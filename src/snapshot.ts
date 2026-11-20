/**
 * Picture of a part of the page exactly as shown (PNG), and a PowerPoint
 * slide with that picture. Works offline: the page is drawn into a canvas
 * through an SVG foreignObject (html-to-image), the slide is built by pptxgenjs.
 */
import { toCanvas } from "html-to-image";

/** Elements left out of pictures: buttons that only make sense in the app. */
export const NO_EXPORT = "no-export";

const pageBackground = () => {
  const bg = getComputedStyle(document.body).backgroundColor;
  return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" ? bg : getComputedStyle(document.documentElement).backgroundColor || "#ffffff";
};

const keep = (n: HTMLElement) =>
  !(n.classList && (n.classList.contains(NO_EXPORT) || n.classList.contains("card-menu") || n.classList.contains("toast")));

/**
 * Draws `el` with a margin around it at `scale` times its on-screen size.
 * Safari sometimes leaves images out on the first pass, so it draws twice.
 */
export async function captureElement(el: HTMLElement, scale = 3, pad = 28): Promise<HTMLCanvasElement> {
  // Picture layout (no scrollbars, whole timeline) first, then measure.
  document.documentElement.classList.add("exporting");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const r = el.getBoundingClientRect();
  const width = Math.ceil(r.width) + pad * 2;
  const height = Math.ceil(r.height) + pad * 2;
  // Very large cards: stay under common canvas limits (Safari: 16.7 M pixels).
  const maxPx = 16_000_000;
  const s = Math.max(1, Math.min(scale, Math.sqrt(maxPx / (width * height))));
  const opts = {
    pixelRatio: s,
    width,
    height,
    backgroundColor: pageBackground(),
    filter: (n: HTMLElement) => keep(n),
    style: { margin: "0", padding: `${pad}px`, boxSizing: "border-box", width: `${width}px`, height: `${height}px`, maxWidth: "none" },
    cacheBust: false,
  } as Parameters<typeof toCanvas>[1];
  try {
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isSafari) await toCanvas(el, opts);
    return await toCanvas(el, opts);
  } finally {
    document.documentElement.classList.remove("exporting");
  }
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("The picture could not be made."))), "image/png"));

export function downloadBlob(blob: Blob, name: string) {
  save(blob, name);
}
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

export const fileSafe = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "card";

/** Downloads a PNG of `el` (3x by default, so it stays sharp on slides and in print). */
export async function downloadPng(el: HTMLElement, name: string, scale = 3) {
  const canvas = await captureElement(el, scale);
  save(await toBlob(canvas), `${fileSafe(name)}.png`);
}

/**
 * Downloads a 16:9 PowerPoint slide with the picture centred on the page
 * colour, and a small caption (team and date) under it.
 */
export async function downloadSlide(el: HTMLElement, name: string, caption: string) {
  const canvas = await captureElement(el, 3);
  const data = canvas.toDataURL("image/png");
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pptx.title = name;
  const W = 13.333,
    H = 7.5,
    m = 0.3,
    capH = caption ? 0.35 : 0;
  const bg = rgbHex(pageBackground());
  const slide = pptx.addSlide();
  slide.background = { color: bg };
  const boxW = W - 2 * m,
    boxH = H - 2 * m - capH;
  const ratio = canvas.width / canvas.height;
  let w = boxW,
    h = w / ratio;
  if (h > boxH) {
    h = boxH;
    w = h * ratio;
  }
  slide.addImage({ data, x: (W - w) / 2, y: m + (boxH - h) / 2, w, h, altText: name });
  if (caption)
    slide.addText(caption, {
      x: m,
      y: H - m - capH,
      w: W - 2 * m,
      h: capH,
      fontSize: 10,
      color: luminance(bg) > 0.5 ? "6B7280" : "9CA3AF",
      align: "right",
      fontFace: "Calibri",
    });
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  save(blob, `${fileSafe(name)}.pptx`);
}

/** "rgb(12, 34, 56)" to "0C2238". */
export function rgbHex(css: string): string {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return css.startsWith("#") && css.length === 7 ? css.slice(1).toUpperCase() : "FFFFFF";
  return [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase();
}
const luminance = (hex: string) => {
  const n = parseInt(hex, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

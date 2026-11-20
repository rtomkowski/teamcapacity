// MIT License, Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>. See LICENSE.
/**
 * Colour palette (v36): "calm" cool greys (default) or "warm" paper tones. A per-computer
 * preference in localStorage, applied as data-palette on <html>; light or dark stays separate.
 */
import { useEffect, useState } from "react";

export type Palette = "calm" | "warm";
const KEY = "tc-palette";

export function loadPalette(): Palette {
  try {
    return localStorage.getItem(KEY) === "warm" ? "warm" : "calm";
  } catch {
    return "calm";
  }
}
function apply(p: Palette) {
  if (p === "warm") document.documentElement.dataset.palette = "warm";
  else delete document.documentElement.dataset.palette;
}
export function setPalette(p: Palette) {
  try {
    if (p === "warm") localStorage.setItem(KEY, p);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: this session only */
  }
  apply(p);
  window.dispatchEvent(new Event("tc-palette"));
}
export function usePalette(): Palette {
  const [p, setP] = useState(loadPalette);
  useEffect(() => {
    const on = () => setP(loadPalette());
    window.addEventListener("tc-palette", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tc-palette", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  useEffect(() => apply(p), [p]);
  return p;
}

const CHOICES: { id: Palette; label: string; note: string; light: string[]; dark: string[] }[] = [
  { id: "calm", label: "Calm", note: "Cool greys, crisp", light: ["#f6f7f9", "#ffffff", "#e3e5ea", "#15171c"], dark: ["#111214", "#1a1b1e", "#2d2f34", "#eceef2"] },
  { id: "warm", label: "Paper", note: "Warm off-white, softer", light: ["#f7f5f0", "#fffdf9", "#e6e1d6", "#1c1a17"], dark: ["#151412", "#1e1c1a", "#34312d", "#efece6"] },
];

export function PaletteSettings({ theme }: { theme: "light" | "dark" }) {
  const current = usePalette();
  return (
    <div>
      <p className="field-hint">
        Saved straight away, for this browser only. Light or dark is chosen with the moon or sun button at the top;
        both palettes keep text at WCAG AA contrast in either.
      </p>
      <div className="palette-choices" role="radiogroup" aria-label="Colour palette">
        {CHOICES.map((c) => (
          <button
            type="button"
            key={c.id}
            role="radio"
            aria-checked={current === c.id}
            className="palette-choice"
            onClick={() => setPalette(c.id)}
          >
            <span className="palette-sample" aria-hidden="true">
              {(theme === "dark" ? c.dark : c.light).map((col) => (
                <i key={col} style={{ background: col }} />
              ))}
            </span>
            <b>{c.label}</b>
            <small>{c.note}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

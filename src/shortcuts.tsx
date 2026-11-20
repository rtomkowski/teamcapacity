// MIT License, Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>. See LICENSE.
/**
 * Keyboard shortcuts (v34). A per-computer preference kept in localStorage, not part of the team file.
 * Single keys only fire when no text field has focus and no dialog is open; combinations with
 * Ctrl or Cmd ("Mod") also fire in text fields. Everything can be changed or switched off in Settings,
 * as WCAG 2.1.4 asks for single-key shortcuts.
 */
import React, { useEffect, useRef, useState } from "react";

export type ShortcutAction =
  | "search"
  | "newAssignment"
  | "newPerson"
  | "newProject"
  | "saveTeam"
  | "switchTeam"
  | "settings"
  | "theme"
  | "help"
  | "goHome"
  | "goTeam"
  | "goProjects"
  | "goShared"
  | "goEngagement"
  | "goAnalytics";

export const SHORTCUT_ACTIONS: { id: ShortcutAction; label: string; group: "Actions" | "Go to" }[] = [
  { id: "search", label: "Search on this page", group: "Actions" },
  { id: "newAssignment", label: "Add assignment", group: "Actions" },
  { id: "newPerson", label: "Add person", group: "Actions" },
  { id: "newProject", label: "New project", group: "Actions" },
  { id: "saveTeam", label: "Save team as JSON", group: "Actions" },
  { id: "switchTeam", label: "Switch or load a team", group: "Actions" },
  { id: "settings", label: "Open Settings", group: "Actions" },
  { id: "theme", label: "Light or dark theme", group: "Actions" },
  { id: "help", label: "Show shortcuts", group: "Actions" },
  { id: "goHome", label: "Home", group: "Go to" },
  { id: "goTeam", label: "Team", group: "Go to" },
  { id: "goProjects", label: "Projects", group: "Go to" },
  { id: "goShared", label: "Shared work", group: "Go to" },
  { id: "goEngagement", label: "Engagement", group: "Go to" },
  { id: "goAnalytics", label: "Analytics", group: "Go to" },
];

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  search: "/",
  newAssignment: "A",
  newPerson: "P",
  newProject: "N",
  saveTeam: "Mod+S",
  switchTeam: "T",
  settings: ",",
  theme: "D",
  help: "?",
  goHome: "1",
  goTeam: "2",
  goProjects: "3",
  goShared: "4",
  goEngagement: "5",
  goAnalytics: "6",
};

export interface ShortcutPrefs {
  enabled: boolean;
  keys: Record<ShortcutAction, string>;
}
const KEY = "tc-shortcuts";
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function loadShortcuts(): ShortcutPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      const keys = { ...DEFAULT_SHORTCUTS };
      for (const a of SHORTCUT_ACTIONS)
        if (typeof raw.keys?.[a.id] === "string" && raw.keys[a.id].length <= 20) keys[a.id] = raw.keys[a.id];
      return { enabled: raw.enabled !== false, keys };
    }
  } catch {
    /* fall back to the defaults */
  }
  return { enabled: true, keys: { ...DEFAULT_SHORTCUTS } };
}
function storeShortcuts(p: ShortcutPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: works for this session only */
  }
  window.dispatchEvent(new Event("tc-shortcuts"));
}

/** The combination a key press stands for, e.g. "Mod+S", "Alt+1", "A", "/", or "" for modifier keys alone. */
export function comboOf(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"> & { code?: string }): string {
  let k = e.key;
  // With Option/Alt a Mac types a symbol (Alt+P gives "π"): use the key's letter or digit instead.
  const m = e.altKey && e.code ? /^(?:Key([A-Z])|Digit([0-9]))$/.exec(e.code) : null;
  if (m) k = m[1] ?? m[2];
  if (!k || k === "Control" || k === "Meta" || k === "Alt" || k === "Shift" || k === "Dead") return "";
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Mod");
  if (e.altKey) parts.push("Alt");
  const printable = k.length === 1;
  // Shift is part of a printable character ("?" or "A"), so it is only named for named keys.
  if (e.shiftKey && !printable) parts.push("Shift");
  const name = printable ? (k === " " ? "Space" : k.toUpperCase()) : k;
  parts.push(name);
  return parts.join("+");
}
/** How a combination is shown: Cmd on a Mac, Ctrl elsewhere. */
export const showCombo = (c: string) =>
  c ? c.replace("Mod", isMac() ? "⌘" : "Ctrl").replace("Alt", isMac() ? "⌥" : "Alt") : "Off";

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export function useShortcutPrefs(): ShortcutPrefs {
  const [p, setP] = useState(loadShortcuts);
  useEffect(() => {
    const on = () => setP(loadShortcuts());
    window.addEventListener("tc-shortcuts", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("tc-shortcuts", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return p;
}

/** Listens for the shortcuts and calls the handler for the matching action. */
export function useShortcuts(handlers: Partial<Record<ShortcutAction, () => void>>, blocked: boolean) {
  const prefs = useShortcutPrefs();
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!prefs.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const combo = comboOf(e);
      if (!combo) return;
      const withMod = combo.startsWith("Mod+") || combo.startsWith("Alt+");
      if (!withMod && (typing(e.target) || blocked || document.querySelector("dialog[open]"))) return;
      if (withMod && document.querySelector("dialog[open]")) return;
      const action = SHORTCUT_ACTIONS.find((a) => prefs.keys[a.id] === combo)?.id;
      const fn = action && ref.current[action];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs, blocked]);
}

/** Settings panel: change, clear or reset each shortcut, or switch them all off. Saved at once on this computer. */
export function ShortcutSettings() {
  const prefs = useShortcutPrefs();
  const [editing, setEditing] = useState<ShortcutAction | null>(null);
  const [note, setNote] = useState("");
  const save = (p: ShortcutPrefs) => storeShortcuts(p);
  const capture = (a: ShortcutAction) => (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setEditing(null);
      setNote("");
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      save({ ...prefs, keys: { ...prefs.keys, [a]: "" } });
      setEditing(null);
      setNote("Shortcut cleared.");
      return;
    }
    const combo = comboOf(e.nativeEvent);
    if (!combo) return;
    if (combo === "Tab" || combo === "Enter" || combo === "Shift+Tab") {
      setNote("Tab and Enter are kept for moving around and pressing buttons.");
      return;
    }
    const other = SHORTCUT_ACTIONS.find((x) => x.id !== a && prefs.keys[x.id] === combo);
    const keys = { ...prefs.keys, [a]: combo };
    if (other) keys[other.id] = "";
    save({ ...prefs, keys });
    setEditing(null);
    setNote(other ? `${showCombo(combo)} was used for "${other.label}", which now has no shortcut.` : "");
  };
  return (
    <div className="shortcut-settings">
      <label className="check-line">
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(e) => save({ ...prefs, enabled: e.target.checked })}
        />
        Use keyboard shortcuts on this computer
      </label>
      <p className="field-hint">
        Single keys work when you are not typing in a field. Click a shortcut and press the new key or
        combination; Backspace clears it, Escape keeps it. Saved straight away, for this browser only.
      </p>
      {(["Actions", "Go to"] as const).map((g) => (
        <div key={g} className="shortcut-group">
          <h4>{g}</h4>
          <ul className="shortcut-list">
            {SHORTCUT_ACTIONS.filter((a) => a.group === g).map((a) => (
              <li key={a.id}>
                <span>{a.label}</span>
                <button
                  type="button"
                  className={`kbd-btn ${editing === a.id ? "listening" : ""} ${prefs.keys[a.id] ? "" : "off"}`}
                  disabled={!prefs.enabled}
                  aria-label={`${a.label}: ${editing === a.id ? "press the new shortcut" : showCombo(prefs.keys[a.id])}. Click to change.`}
                  onClick={() => {
                    setEditing(a.id);
                    setNote("");
                  }}
                  onKeyDown={editing === a.id ? capture(a.id) : undefined}
                  onBlur={() => editing === a.id && setEditing(null)}
                >
                  {editing === a.id ? "Press keys…" : <kbd>{showCombo(prefs.keys[a.id])}</kbd>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="field-hint" role="status" aria-live="polite">
        {note}
      </p>
      <button
        type="button"
        className="btn"
        onClick={() => {
          save({ enabled: true, keys: { ...DEFAULT_SHORTCUTS } });
          setNote("Shortcuts reset to the defaults.");
        }}
      >
        Reset to defaults
      </button>
    </div>
  );
}

/** Read-only list, for the "Show shortcuts" dialog. */
export function ShortcutList() {
  const prefs = useShortcutPrefs();
  return (
    <div className="shortcut-settings">
      {!prefs.enabled && <p className="field-hint">Shortcuts are switched off on this computer (Settings, Shortcuts).</p>}
      {(["Actions", "Go to"] as const).map((g) => (
        <div key={g} className="shortcut-group">
          <h4>{g}</h4>
          <ul className="shortcut-list">
            {SHORTCUT_ACTIONS.filter((a) => a.group === g).map((a) => (
              <li key={a.id}>
                <span>{a.label}</span>
                <kbd className={prefs.keys[a.id] ? "" : "off"}>{showCombo(prefs.keys[a.id])}</kbd>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

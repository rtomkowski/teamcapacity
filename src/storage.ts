import type { Plan } from "./model";
import { restoreWorkspace, type TeamWorkspace } from "./teams.ts";
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pem-capacity", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("plans");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
export async function loadWorkspace(initialPlan: Plan, initialName?: string): Promise<TeamWorkspace> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("plans", "readonly");
    const store = tx.objectStore("plans");
    const workspace = store.get("workspace");
    const legacy = store.get("current");
    tx.oncomplete = () => {
      db.close();
      try {
        resolve(restoreWorkspace(workspace.result, legacy.result, initialPlan, initialName));
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function saveWorkspace(workspace: TeamWorkspace): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("plans", "readwrite");
    tx.objectStore("plans").put(workspace, "workspace");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
/** The last version this computer read from or wrote to a shared file (v30), the base for merging. */
export async function loadSyncBase<T>(key: string): Promise<T | undefined> {
  try {
    const db = await database();
    return await new Promise((resolve) => {
      const tx = db.transaction("plans", "readonly");
      const req = tx.objectStore("plans").get(`syncbase:${key}`);
      tx.oncomplete = () => {
        db.close();
        resolve(req.result as T | undefined);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        resolve(undefined);
      };
    });
  } catch {
    return undefined;
  }
}
export async function saveSyncBase(key: string, value: unknown): Promise<void> {
  try {
    const db = await database();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("plans", "readwrite");
      tx.objectStore("plans").put(JSON.parse(JSON.stringify(value)), `syncbase:${key}`);
      tx.oncomplete = tx.onerror = tx.onabort = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    /* a missing base only means the next merge keeps everything from both sides */
  }
}
export function download(
  content: BlobPart,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  link.style.display = "none";
  // v34: in the page while clicking, which older Firefox versions need.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------------------------------------------------- Auto-save to a file */
// Chrome, Edge, Arc and Opera can write to a chosen file (File System Access API).
// Safari and Firefox cannot; there auto-save downloads a copy instead.
type Writable = { write: (d: string) => Promise<void>; close: () => Promise<void> };
export type FileHandle = {
  name: string;
  createWritable: () => Promise<Writable>;
  getFile?: () => Promise<File>;
  queryPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
};
export const canPickFile = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;
const handleDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pem-capacity-autosave", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
async function handleOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await handleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", mode);
    const req = fn(tx.objectStore("handles"));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export const loadAutosaveHandle = () =>
  handleOp<FileHandle | undefined>("readonly", (s) => s.get("autosave")).catch(() => undefined);
export const storeAutosaveHandle = (h: FileHandle) => handleOp("readwrite", (s) => s.put(h, "autosave"));
export const clearAutosaveHandle = () => handleOp("readwrite", (s) => s.delete("autosave")).catch(() => undefined);
export async function pickAutosaveFile(): Promise<FileHandle> {
  const picker = (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileHandle> }).showSaveFilePicker;
  const h = await picker({
    suggestedName: "team-capacity-autosave.json",
    types: [{ description: "Team capacity backup", accept: { "application/json": [".json"] } }],
  });
  await storeAutosaveHandle(h).catch(() => undefined); // still usable this session if it cannot be remembered
  return h;
}
/** "granted", or "prompt" when the browser needs a click before writing again. */
export async function filePermission(h: FileHandle, ask = false): Promise<PermissionState> {
  if (!h.queryPermission) return "granted";
  const now = await h.queryPermission({ mode: "readwrite" });
  if (now === "granted" || !ask || !h.requestPermission) return now;
  return h.requestPermission({ mode: "readwrite" });
}
/** The shared file's text and time, or undefined when it is empty or cannot be read. */
export async function readFromFile(h: FileHandle): Promise<{ text: string; modified: number } | undefined> {
  if (!h.getFile) return undefined;
  try {
    const f = await h.getFile();
    const text = await f.text();
    return text.trim() ? { text, modified: f.lastModified } : undefined;
  } catch {
    return undefined;
  }
}
export async function writeToFile(h: FileHandle, text: string) {
  const w = await h.createWritable();
  try {
    await w.write(text);
    await w.close();
  } catch (e) {
    // v34: drop the half-written copy so the file on disk stays as it was.
    await (w as Writable & { abort?: () => Promise<void> }).abort?.().catch(() => undefined);
    throw e;
  }
}

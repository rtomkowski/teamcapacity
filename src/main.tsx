import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Home as HomeIcon,
  Pencil,
  CalendarRange,
  Grid3X3,
  FolderKanban,
  Users,
  CalendarClock,
  Scale,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  ListChecks,
  Settings as SettingsIcon,
  Database,
  Link2,
  Upload,
  GitMerge,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  HardDrive,
  Settings2,
  MoreHorizontal,
  Clock3,
  FileSpreadsheet,
  ArrowDownToLine,
  RotateCcw,
  SlidersHorizontal,
  Circle,
  CalendarDays,
  Trash2,
  Info,
  Sun,
  Moon,
  Camera,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import seed from "./seed.json";
// The team shown the first time the app opens: the fictional Northfield demo team.
const SEED_TEAM = "Northfield (demo)";
import { useShortcuts, ShortcutSettings, ShortcutList } from "./shortcuts";
import { removeTeam, restoreTeam, type Team } from "./teams.ts";
import { PaletteSettings, usePalette } from "./palette";
import { largestTakeaway } from "./insights.ts";
import { APP_NAME, APP_VERSION, AUTHOR, AUTHOR_EMAIL, LICENSE_TEXT } from "./about";
import demoEE from "./demo-ee.json";
import {
  type Plan,
  type Status,
  type ProjectStatus,
  type Project,
  type Person,
  type Kind,
  type AssignmentTask,
  type WorkItem,
  type WorkStatus,
  workItemsOf,
  workItemUses,
  workItemProjects,
  workItemParts,
  type ProjectRef,
  workStatuses,
  workStatusLabels,
  wouldLoop,
  type ProjectDates,
  type Extension,
  type DateChange,
  DATE_FIELDS,
  type Schedule,
  type TeachingPeriod,
  MODES_FOR,
  ROLES_FOR,
  PERCENT_MAX,
  OVERLOAD_DEFAULT,
  overloadLevel,
  taskPercent,
  involvement,
  personInvolvement,
  involvementSignal,
  type Assignment,
  PROJECT_ABBR_MAX,
  ROLE_TEXT_MAX,
  roleName,
  type RoleEntry,
  periodsOf,
  scheduleWeekHours,
  scheduleBounds,
  scheduleSummary,
  currentEnd,
  type TaskType,
  taskLibrary,
  tracksCapacity,
  DEFAULT_TASKS,
  TASK_COLORS,
  personStatuses,
  personStatusLabels,
  kinds,
  kindLabels,
  kindOf,
  isActivity,
  clone,
  uid,
  monday,
  addWeeks,
  weekLabel,
  capacityFor,
  personLoad,
  assignmentCounts,
  setAllocation,
  validatePlan,
  statuses,
  projectStatuses,
  dateKey,
  parseDate,
  teamAbbr,
  teamFullName,
  PROFILE_LIMITS,
  addWholeTeam,
  applyConnections,
  assignmentDiff,
  type DiffLine,
  blockerLabels,
  type TeamProfile,
  StageDef,
  stageDefs,
  stageKey,
  stageLabel,
  setStageNames,
  typeOptions,
  funderOptions,
  centreOptions,
  unstaffedProjects,
  projectLabel,
  staleProjects,
  cleanList,
  renameOnProjects,
  DEFAULT_TYPES,
  LIST_MAX,
  builtinStageLabel,
  milestoneKindLabels,
  DATE_GROUPS_FOR,
  endShift,
  carryMove,
  daysBetween,
  type DateGroup,
} from "./model";
import { MilestoneEditor, toDrafts, fromDrafts, type MilestoneDraft } from "./milestones";
import {
  loadWorkspace,
  saveWorkspace,
  download,
  canPickFile,
  loadAutosaveHandle,
  pickAutosaveFile,
  clearAutosaveHandle,
  filePermission,
  writeToFile,
  readFromFile,
  loadSyncBase,
  saveSyncBase,
  type FileHandle,
} from "./storage";
import {
  type TeamWorkspace,
  type TeamSetup,
  createWorkspace,
  addTeam,
  addTeamFromPlan,
  switchTeam,
  updateTeamPlan,
  validateWorkspace,
} from "./teams";
import { importExcel, exportExcel } from "./excel";
import { mergePlans, mergeWorkspaces, restoreConflict } from "./merge";
import {
  TeamView,
  ProjectsView,
  AnalyticsCards,
  HomeView,
  OutlookCard,
  HoursByProjectCard,
  TasksOverviewCard,
  TaskPicker,
  PatchContext,
  GroupPicker,
  SharedWorkView,
  ScheduleEditor,
  StatusPill,
  newTaskType,
  useSort,
  sortBy,
  SortControl,
  PhotoContext,
  usePhoto,
  ProjectDetail,
  HomeHeader,
  InvolvementChart,
  AnalyticsBuilder,
  AnalyticsSections,
  useAnalyticsPrefs,
} from "./views";
import { photoFromFile } from "./photo";
import { useHomePrefs, useNow, useWeather, saveHomePrefs, loadHomePrefs, findPlaces, type WeatherPlace } from "./homeinfo";
import "./style.css";
import "./appearance.css";
import "./unified.css";
import "./glow.css";
import "./calm.css";
import "./v36.css";

type View = "home" | "overview" | "capacity" | "matrix" | "projects" | "shared" | "people" | "data";
type ModalState = {
  type:
    | "person"
    | "project"
    | "allocation"
    | "assignment"
    | "cell"
    | "capacity"
    | "team"
    | "help"
    | "license"
    | "shortcuts"
    | "workspace-import"
    | "settings"
    | "workitem"
    | "import"
    | "profile"
    | "projectView";
  id?: string;
  /** Settings tab to open. */
  tab?: string;
  personId?: string;
  projectId?: string;
  week?: string;
  plan?: Plan;
  kind?: Kind;
  workspace?: TeamWorkspace;
  warnings?: string[];
  /** Where Close and Save return to, e.g. the project overview after editing. */
  back?: ModalState;
};
const nav = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "people", label: "Team", icon: Users },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "shared", label: "Shared work", icon: Link2 },
  { id: "capacity", label: "Capacity", icon: CalendarRange },
  { id: "matrix", label: "Engagement", icon: Grid3X3 },
  { id: "overview", label: "Analytics", icon: LayoutDashboard },
] as const;
const titles: Record<View, string> = {
  home: "Home",
  overview: "Analytics",
  capacity: "Capacity",
  matrix: "Engagement",
  projects: "Projects",
  shared: "Shared work",
  people: "Team",
  data: "Data & backups",
};
const subtitles: Record<View, string> = {
  home: "About the team, at a glance",
  overview: "Workload, open estimates and what needs attention",
  capacity: "Weekly project hours against available capacity",
  matrix: "Who works on which project",
  projects: "Research projects and activities such as teaching, supervision and networking",
  shared: "Work several projects build on, who does which part, and what waits on what",
  people: "Who is busy with what this week",
  data: "Import, export and backups",
};
const stageName = (s: string) => stageLabel(s);
const MONTHS3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niceDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS3[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const weekEndLabel = (week: string) => {
  const d = parseDate(week);
  d.setDate(d.getDate() + 6);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const matches = (s: string, q: string) =>
  s.toLowerCase().includes(q.toLowerCase());
function Avatar({
  name,
  index = 0,
  small = false,
}: {
  name: string;
  index?: number;
  small?: boolean;
}) {
  const photo = usePhoto(name);
  return (
    <span className={`avatar a${index % 6} ${small ? "small" : ""}${photo ? " has-photo" : ""}`}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  );
}
type ListRow = { key: string; orig: string | null; name: string };
const listRows = (xs: string[]): ListRow[] => xs.map((x) => ({ key: uid(), orig: x, name: x }));
/** Editable list of names (project types, funders) with move up/down, remove and usage counts. */
function NameListEditor({
  rows,
  setRows,
  used,
  what,
  placeholder,
}: {
  rows: ListRow[];
  setRows: React.Dispatch<React.SetStateAction<ListRow[]>>;
  used: (name: string) => number;
  what: string;
  placeholder: string;
}) {
  const move = (i: number, d: number) =>
    setRows((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <>
      <div className="plist">
        {rows.map((r, i) => {
          const n = r.orig ? used(r.orig) : 0;
          const renamed = r.orig && r.name.trim() && r.name.trim() !== r.orig;
          return (
            <div className="plist-row" key={r.key}>
              <span className="plist-num">{i + 1}</span>
              <input
                aria-label={`${what} name`}
                value={r.name}
                maxLength={500}
                placeholder={placeholder}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((l) => l.map((x) => (x.key === r.key ? { ...x, name: v } : x)));
                }}
              />
              <span className={`plist-use${renamed && n ? " warn" : ""}`}>
                {n ? (renamed ? `renames ${n}` : `${n} in use`) : "not used"}
              </span>
              <span className="plist-move">
                <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={14} />
                </button>
                <button type="button" className="icon-btn" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={14} />
                </button>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${r.name || what}`}
                onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="plist-actions">
        <button
          type="button"
          className="btn"
          disabled={rows.length >= LIST_MAX}
          onClick={() => setRows((l) => [...l, { key: uid(), orig: null, name: "" }])}
        >
          <Plus size={15} />
          Add {what.toLowerCase()}
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            setRows((l) =>
              [...l].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
            )
          }
        >
          Sort A to Z
        </button>
      </div>
    </>
  );
}
function Badge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {stageLabel(status)}
    </span>
  );
}
function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <CalendarRange size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`${wide ? "dialog wide" : "dialog"} ${className}`.trim()}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-header">
        <div>
          <p className="eyebrow">{eyebrow ?? "TEAM WORKSPACE"}</p>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
// Fingerprint of a plan, used to tell whether it changed since its last backup.
function planHash(p: Plan): string {
  const text = JSON.stringify(p);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${text.length}-${h.toString(16)}`;
}
const backupKey = (teamId: string) => `tc-backup-${teamId}`;
function backedUp(teamId: string, p: Plan): boolean {
  try {
    return localStorage.getItem(backupKey(teamId)) === planHash(p);
  } catch {
    return false;
  }
}
function markBackedUp(teamId: string, p: Plan) {
  try {
    localStorage.setItem(backupKey(teamId), planHash(p));
  } catch {}
}
function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("tc-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    // v35: follow the computer's setting until the person picks a theme.
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  usePalette(); // v36: applies the chosen palette (Settings, Appearance)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("tc-theme", theme);
    } catch {}
  }, [theme]);
  const [workspace, setWorkspace] = useState<TeamWorkspace>(() =>
    createWorkspace(seed as Plan, SEED_TEAM),
  );
  const activeTeam = workspace.teams.find(
    (team) => team.id === workspace.activeTeamId,
  )!;
  const plan = activeTeam.plan;
  setStageNames(plan);
  const setPlan = (next: Plan) =>
    setWorkspace((current) => updateTeamPlan(current, next));
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading");
  // Auto-save to a file: a per-computer preference, not part of the team plan.
  const [autoMinutes, setAutoMinutesState] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("tc-autosave-minutes")) || 0;
    } catch {
      return 0;
    }
  });
  const setAutoMinutes = (m: number) => {
    setAutoMinutesState(m);
    try {
      if (m) localStorage.setItem("tc-autosave-minutes", String(m));
      else localStorage.removeItem("tc-autosave-minutes");
    } catch {}
  };
  const [autoHandle, setAutoHandle] = useState<FileHandle | undefined>();
  const [autoState, setAutoState] = useState<"ok" | "needs-permission" | "error" | "">("");
  const [autoLast, setAutoLast] = useState("");
  const autoHash = useRef("");
  const fileSeen = useRef(0);
  const [view, setView] = useState<View>("home");
  const homePrefs = useHomePrefs();
  const now = useNow();
  // v33: the greeting line (with weather) shows on every page.
  const wx = useWeather(homePrefs, true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [week, setWeek] = useState(monday());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [teamDialog, setTeamDialog] = useState<"switch" | "create" | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [guard, setGuard] = useState<{ label: string; run: () => void } | null>(
    null,
  );
  const [undo, setUndo] = useState<Plan | null>(null);
  // v40: the last removed team, so the toast can bring it back.
  const [removedTeam, setRemovedTeam] = useState<{ team: Team; index: number; wasActive: boolean } | null>(null);
  const [chart, setChart] = useState<"assignments" | "hours">("hours");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [fatal, setFatal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const teamFileRef = useRef<HTMLInputElement>(null);
  const mergeFileRef = useRef<HTMLInputElement>(null);
  const [anPrefs, setAnPrefs] = useAnalyticsPrefs();
  const serial = useRef(Promise.resolve());
  const revision = useRef(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadWorkspace(seed as Plan, SEED_TEAM)
      .then((value) => {
        if (active) {
          setWorkspace(value);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) {
          setFatal(
            `Local data could not be loaded: ${e.message}. The demo team is shown below. Export a backup before closing.`,
          );
          setSaveStatus("Not saved");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const current = ++revision.current;
    setSaveStatus("Saving");
    const timer = setTimeout(() => {
      const snapshot = clone(workspace);
      serial.current = serial.current
        .catch(() => {})
        .then(() => saveWorkspace(snapshot))
        .then(() => {
          if (current === revision.current) setSaveStatus("Saved locally");
        })
        .catch(() => {
          if (current === revision.current) setSaveStatus("Save failed");
        });
    }, 150);
    return () => clearTimeout(timer);
  }, [workspace, ready, retry]);
  useEffect(() => {
    if (canPickFile()) loadAutosaveHandle().then((h) => h && setAutoHandle(h));
  }, []);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const autoBusy = useRef(false);
  const autoSaveNow = async (manual = false, handle: FileHandle | undefined = autoHandle) => {
    // v34: one save at a time, so a timed save and "Merge and save now" cannot write over each other.
    if (autoBusy.current) return;
    autoBusy.current = true;
    try {
      await autoSaveOnce(manual, handle);
    } finally {
      autoBusy.current = false;
    }
  };
  const autoSaveOnce = async (manual: boolean, handle: FileHandle | undefined) => {
    let ws = workspaceRef.current;
    const hash = planHash(ws as unknown as Plan);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    try {
      if (handle) {
        const perm = await filePermission(handle, manual);
        if (perm !== "granted") {
          setAutoState("needs-permission");
          return;
        }
        // v30: read the shared file first and merge what others saved, so nothing is overwritten.
        const file = await readFromFile(handle);
        if (!manual && hash === autoHash.current && (!file || file.modified === fileSeen.current)) return;
        if (file) {
          let theirs: TeamWorkspace | undefined;
          try {
            const value = JSON.parse(file.text);
            if (value?.format === "pem-team-workspace") theirs = validateWorkspace(value);
          } catch {
            theirs = undefined;
          }
          if (theirs && planHash(theirs as unknown as Plan) !== hash) {
            const base = await loadSyncBase<TeamWorkspace>(`file:${handle.name}`);
            if (!base || planHash(base as unknown as Plan) !== planHash(theirs as unknown as Plan)) {
              const r = mergeWorkspaces(base, ws, theirs);
              if (workspaceRef.current !== ws) return; // edited meanwhile: merge on the next round
              ws = r.merged;
              workspaceRef.current = ws;
              setWorkspace(ws);
              if (r.fromTheirs || r.conflicts.length)
                notify(
                  `Merged ${r.fromTheirs} ${r.fromTheirs === 1 ? "change" : "changes"} from the shared file` +
                    (r.conflicts.length ? `; ${r.conflicts.length} set aside (Settings > Data)` : ""),
                );
            }
          }
        }
        await writeToFile(handle, JSON.stringify(ws, null, 2));
        await saveSyncBase(`file:${handle.name}`, ws);
        const after = await readFromFile(handle);
        fileSeen.current = after?.modified ?? Date.now();
      } else if (canPickFile()) {
        return; // no file chosen yet
      } else {
        const d = new Date();
        if (!manual && hash === autoHash.current) return;
        download(JSON.stringify(ws, null, 2), `team-capacity-autosave-${dateKey(d)}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.json`);
        await saveSyncBase("download", ws);
      }
      autoHash.current = planHash(ws as unknown as Plan);
      ws.teams.forEach((t) => markBackedUp(t.id, t.plan));
      setAutoState("ok");
      setAutoLast(time);
    } catch {
      setAutoState("error");
    }
  };
  useEffect(() => {
    if (!ready || !autoMinutes) return;
    const id = setInterval(() => void autoSaveNow(), autoMinutes * 60000);
    return () => clearInterval(id);
  }, [ready, autoMinutes, autoHandle]);
  const autosave = {
    minutes: autoMinutes,
    setMinutes: setAutoMinutes,
    fileName: autoHandle?.name,
    canPick: canPickFile(),
    state: autoState,
    last: autoLast,
    choose: async () => {
      try {
        const h = await pickAutosaveFile();
        setAutoHandle(h);
        autoHash.current = "";
        setAutoState("");
        if (!autoMinutes) setAutoMinutes(5);
        await autoSaveNow(true, h);
      } catch {
        /* picker cancelled */
      }
    },
    forget: async () => {
      await clearAutosaveHandle();
      setAutoHandle(undefined);
      setAutoState("");
    },
    saveNow: () => autoSaveNow(true),
  };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        saveStatus === "Saving" ||
        saveStatus === "Save failed" ||
        saveStatus === "Not saved"
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: View, status = "all") => {
    setView(next);
    setQuery("");
    setFilter(status);
    setMenu(false);
    setMobileNav(false);
  };
  const notify = (message: string) => {
    setToast(message);
    setRemovedTeam(null); // a new message replaces the team Undo (v40)
  };
  const change = (next: Plan, message = "Workspace updated") => {
    setUndo(clone(plan));
    setPlan(next);
    notify(message);
  };
  const [defaultHours, setDefaultHours] = useState("40");
  const [capSort, setCapSort] = useSort("tc-sort-capacity", { by: "name", dir: "asc" });
  const patch = (fn: (p: Plan) => void, message?: string) => {
    const next = clone(plan);
    fn(next);
    change(next, message);
  };
  const removeAssignment = (id: string) => {
    const a = plan.assignments.find((x) => x.id === id);
    const who = a && plan.people.find((x) => x.id === a.personId)?.name;
    patch((p) => {
      p.assignments = p.assignments.filter((x) => x.id !== id);
      p.allocations = p.allocations.filter((x) => x.assignmentId !== id);
    }, who ? `${who} removed` : "Removed");
  };
  const open = (m: ModalState) => {
    setModal(m);
    setMenu(false);
    setMobileNav(false);
  };
  // v34: keyboard shortcuts (changeable in Settings > Shortcuts).
  useShortcuts(
    {
      search: () => {
        const el = document.querySelector<HTMLInputElement>("main .search-field input, main input[type=search]");
        el?.focus();
        el?.select();
      },
      newAssignment: () => open({ type: "assignment" }),
      newPerson: () => open({ type: "person" }),
      newProject: () => open({ type: "project" }),
      saveTeam: () => backup(),
      switchTeam: () => setTeamDialog("switch"),
      settings: () => open({ type: "settings" }),
      theme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      help: () => open({ type: "shortcuts" }),
      goHome: () => navigate("home"),
      goTeam: () => navigate("people"),
      goProjects: () => navigate("projects"),
      goShared: () => navigate("shared"),
      goEngagement: () => navigate("matrix"),
      goAnalytics: () => navigate("overview"),
    },
    !ready || !!modal || !!teamDialog || !!guard,
  );
  const resetTeamView = () => {
    setModal(null);
    setTeamDialog(null);
    setUndo(null);
    setToast("");
    setChart("hours");
    setWeek(monday());
    navigate("overview");
  };
  // Ask for a backup of the current team before leaving it or importing.
  const guarded = (label: string, run: () => void) => {
    if (backedUp(activeTeam.id, plan)) run();
    else {
      setTeamDialog(null);
      setGuard({ label, run });
    }
  };
  const selectTeam = (id: string) => {
    if (id === workspace.activeTeamId) {
      setTeamDialog(null);
      return;
    }
    const name = workspace.teams.find((t) => t.id === id)?.name ?? "the team";
    guarded(`open ${name}`, () => {
      setWorkspace((current) => switchTeam(current, id));
      resetTeamView();
    });
  };
  // v40: remove a team from this browser, with a copy offered first and Undo in the toast.
  const downloadTeam = (id: string) => {
    const t = workspace.teams.find((x) => x.id === id);
    if (!t) return;
    download(
      JSON.stringify({ ...t.plan }, null, 2),
      `pem-${t.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-backup-${dateKey(new Date())}.json`,
    );
    markBackedUp(t.id, t.plan);
    notify(`Copy of ${teamAbbr(t.plan, t.name)} downloaded`);
  };
  const deleteTeam = (id: string) => {
    try {
      const r = removeTeam(workspace, id);
      setWorkspace(r.workspace);
      if (r.wasActive) resetTeamView();
      setUndo(null);
      notify(`${teamAbbr(r.removed.plan, r.removed.name)} removed from this browser`);
      setRemovedTeam({ team: r.removed, index: r.index, wasActive: r.wasActive }); // after notify, which clears it
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const createTeam = (name: string, setup: TeamSetup) => {
    const next = addTeam(workspace, name, setup);
    guarded(`create ${name.trim()}`, () => {
      setWorkspace(next);
      resetTeamView();
      notify(
        `${name.trim()} created${setup === "sample" ? " with dummy data" : " with an empty setup"}`,
      );
    });
  };
  const chooseImport = () =>
    guarded("import a file", () => fileRef.current?.click());
  // v27: load a team's JSON file from the team switcher, as a new team next to the others.
  async function loadTeamFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Please use a file smaller than 20 MB.");
      const value = JSON.parse(await file.text());
      setTeamDialog(null);
      if (value?.format === "pem-team-workspace") {
        open({ type: "workspace-import", workspace: validateWorkspace(value) });
        return;
      }
      const next = addTeamFromPlan(workspace, validatePlan(value), file.name);
      const name = next.teams[next.teams.length - 1].name;
      guarded(`open ${name}`, () => {
        setWorkspace(next);
        resetTeamView();
        notify(`${name} loaded from ${file.name}`);
      });
    } catch (e) {
      notify(`This file could not be loaded: ${(e as Error).message}`);
    } finally {
      if (teamFileRef.current) teamFileRef.current.value = "";
    }
  }
  // v31: add the fictional "Experimental Engineering" demo team next to the others.
  function addDemoTeam() {
    try {
      const next = addTeamFromPlan(workspace, validatePlan(demoEE), "", "Experimental Engineering (demo)");
      const name = next.teams[next.teams.length - 1].name;
      setTeamDialog(null);
      guarded(`open ${name}`, () => {
        setWorkspace(next);
        resetTeamView();
        notify(`${name} added. It is fictional; remove it in the team switcher when you are done.`);
      });
    } catch (e) {
      notify(`The demo team could not be added: ${(e as Error).message}`);
    }
  }
  const counts = assignmentCounts(plan);
  const activeProjects = plan.projects.filter(
    (p) => p.status === "ongoing" || p.status === "planned",
  ).length;
  // With capacity tracking off, hour-based hints are not shown anywhere.
  const track = tracksCapacity(plan);
  const missing = !track
    ? 0
    : plan.assignments.filter((a) => a.status !== "finished" && !a.estimated)
        .length;
  const unsetCapacity = !track
    ? 0
    : plan.people.filter((p) => p.capacityHours == null).length;
  const over = !track
    ? 0
    : plan.people.filter((p) => personLoad(plan, p.id, week).over).length;
  const noTasks = track
    ? 0
    : plan.assignments.filter(
        (a) => a.status !== "finished" && !a.tasks?.length,
      ).length;
  const chartMode: "assignments" | "hours" = track ? chart : "assignments";
  // v34: review hints that also make sense without hours.
  const unstaffed = unstaffedProjects(plan);
  const stale = staleProjects(plan, dateKey(new Date()));
  const overInv = track ? 0 : plan.people.filter((p) => involvementSignal(plan, p.id).alarm).length;
  const people = plan.people.filter((p) => matches(p.name, query));
  const projects = plan.projects.filter(
    (p) =>
      matches(p.name, query) &&
      (filter === "all" ||
        (filter === "unstaffed"
          ? !plan.assignments.some((a) => a.projectId === p.id)
          : p.status === filter)),
  );
  const nameMatches = plan.people.filter((p) => matches(p.name, query));
  const matrixPeople = nameMatches.length ? nameMatches : plan.people;
  const matrixProjects = nameMatches.length
    ? plan.projects
    : plan.projects.filter((p) => matches(p.name, query));
  const backup = () => {
    download(
      JSON.stringify({ ...plan }, null, 2),
      `pem-${activeTeam.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-backup-${dateKey(new Date())}.json`,
    );
    markBackedUp(activeTeam.id, plan);
    void saveSyncBase(`team:${activeTeam.id}`, plan);
    notify(`Backup downloaded for ${activeTeam.name}`);
    setMenu(false);
  };
  // v30: merge a file someone else saved (a whole workspace or one team) into what is here.
  async function mergeFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Please use a file smaller than 20 MB.");
      const value = JSON.parse(await file.text());
      setTeamDialog(null);
      if (value?.format === "pem-team-workspace") {
        const theirs = validateWorkspace(value);
        const base = await loadSyncBase<TeamWorkspace>("download");
        const r = mergeWorkspaces(base, workspace, theirs);
        setWorkspace(r.merged);
        await saveSyncBase("download", r.merged);
        notify(`Merged ${file.name}: ${r.fromTheirs} ${r.fromTheirs === 1 ? "change" : "changes"} taken${r.conflicts.length ? `, ${r.conflicts.length} set aside (Settings > Data)` : ""}. Save to share the result.`);
      } else {
        const theirs = validatePlan(value);
        const base = await loadSyncBase<Plan>(`team:${activeTeam.id}`);
        const r = mergePlans(base, plan, theirs);
        setWorkspace((current) => updateTeamPlan(current, r.merged));
        await saveSyncBase(`team:${activeTeam.id}`, r.merged);
        notify(`Merged ${file.name} into ${activeTeam.name}: ${r.fromTheirs} ${r.fromTheirs === 1 ? "change" : "changes"} taken${r.conflicts.length ? `, ${r.conflicts.length} set aside (Settings > Data)` : ""}. Save team to share the result.`);
      }
    } catch (e) {
      notify(`This file could not be merged: ${(e as Error).message}`);
    } finally {
      if (mergeFileRef.current) mergeFileRef.current.value = "";
    }
  }
  const backupAllTeams = () => {
    download(
      JSON.stringify(workspace, null, 2),
      `pem-all-teams-backup-${dateKey(new Date())}.json`,
    );
    workspace.teams.forEach((t) => markBackedUp(t.id, t.plan));
    void saveSyncBase("download", workspace);
    notify(`Backup downloaded for all ${workspace.teams.length} teams`);
    setMenu(false);
  };
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Please use a file smaller than 20 MB.");
      let result;
      if (file.name.toLowerCase().endsWith(".json")) {
        const value = JSON.parse(await file.text());
        if (value?.format === "pem-team-workspace") {
          open({
            type: "workspace-import",
            workspace: validateWorkspace(value),
          });
          return;
        }
        result = {
          plan: validatePlan(value),
          warnings: [
            `This backup replaces the plan for ${activeTeam.name}, including capacity and weekly allocations. Other teams are kept.`,
          ],
        };
      } else result = await importExcel(file);
      open({ type: "import", ...result });
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function exportWorkbook() {
    setMenu(false);
    setBusy(true);
    try {
      await exportExcel(plan);
      notify("Excel workbook exported, including your full capacity plan");
    } catch (e) {
      notify(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }
  const WeekControl = () => (
    <div className="week-controls">
      <button
        className="icon-btn"
        aria-label="Previous week"
        onClick={() => setWeek(addWeeks(week, -1))}
      >
        <ChevronLeft size={17} />
      </button>
      <label className="week-picker">
        <CalendarDays size={16} />
        <span>Week of {weekLabel(week, true)}</span>
        <input
          aria-label="Week starting"
          type="date"
          value={week}
          onChange={(e) => {
            if (e.target.value) setWeek(monday(e.target.value));
          }}
        />
      </label>
      <button
        className="icon-btn"
        aria-label="Next week"
        onClick={() => setWeek(addWeeks(week, 1))}
      >
        <ChevronRight size={17} />
      </button>
      <button className="today-btn" onClick={() => setWeek(monday())}>
        Today
      </button>
    </div>
  );
  function metric(
    label: string,
    value: React.ReactNode,
    note: string,
    Icon: typeof Users,
    tone = "",
  ) {
    return (
      <div className={`metric ${tone}`}>
        <div className="metric-label">
          {label}
          <span>
            <Icon size={17} />
          </span>
        </div>
        <div className="metric-value">{value}</div>
        <p>{note}</p>
      </div>
    );
  }
  function statusFilters() {
    return (
      <div className="tabs status-tabs">
        {[
          "all",
          ...projectStatuses.filter((s) => s !== "unspecified"),
          "unstaffed",
          "unspecified",
        ].map((s) => (
          <button
            key={s}
            className={filter === s ? "selected" : ""}
            onClick={() => setFilter(s)}
          >
            {s === "all"
              ? "All projects"
              : s === "unspecified"
                ? "Stage not set"
                : s[0].toUpperCase() + s.slice(1)}
            <span>
              {s === "all"
                ? plan.projects.length
                : s === "unstaffed"
                  ? plan.projects.filter(
                      (p) =>
                        !plan.assignments.some((a) => a.projectId === p.id),
                    ).length
                  : plan.projects.filter((p) => p.status === s).length}
            </span>
          </button>
        ))}
      </div>
    );
  }
  const projectGroup = (_name: string) => `${activeTeam.name} project`;

  if (!ready && !fatal)
    return (
      <div className="loading-workspace" role="status">
        <HardDrive size={22} />
        Loading your teams…
      </div>
    );

  const dataPanel = (
            <>
              <div className="data-grid">
                <section className="card data-card">
                  <span className="feature-icon">
                    <HardDrive size={24} />
                  </span>
                  <h2>Back up your teams</h2>
                  <p>
                    Save all {workspace.teams.length} teams, including people,
                    projects, capacity settings and every weekly allocation.
                  </p>
                  <button type="button" className="btn primary" onClick={backupAllTeams}>
                    <Download size={16} />
                    Download all teams backup
                  </button>
                  <button type="button" className="text-btn" onClick={backup}>
                    Download this team only
                  </button>
                  <small>Keep a copy outside this browser.</small>
                </section>
                <section className="card data-card">
                  <span className="feature-icon blue">
                    <Upload size={24} />
                  </span>
                  <h2>Import or restore</h2>
                  <p>
                    Open an Excel engagement workbook or restore a full JSON
                    backup. Single-team files replace this team's plan. All-team
                    backups restore the full workspace after review.
                  </p>
                  <button
 type="button"
                    className="btn"
                    disabled={busy}
                    onClick={chooseImport}
                  >
                    <Upload size={16} />
                    {busy ? "Reading file…" : "Choose a file"}
                  </button>
                  <small>
                    Excel (.xlsx) or Team capacity backup (.json), up to 20 MB
                  </small>
                </section>
                <section className="card data-card">
                  <span className="feature-icon green">
                    <GitMerge size={24} />
                  </span>
                  <h2>Merge a colleague's file</h2>
                  <p>
                    When several people edit, each saves to the shared file. Merging combines their file with what is
                    here record by record: changes on different people, projects or assignments are all kept. If the
                    same thing was changed on both sides, this computer's version is kept and the other is set aside below.
                  </p>
                  <button type="button" className="btn" onClick={() => mergeFileRef.current?.click()}>
                    <GitMerge size={16} />
                    Choose a file to merge
                  </button>
                  <small>
                    {autosave.fileName
                      ? `Auto-save to ${autosave.fileName} merges by itself before each save.`
                      : "With auto-save to a file (Chrome, Edge, Arc, Opera) this happens by itself before each save."}
                  </small>
                </section>
                <section className="card data-card">
                  <span className="feature-icon amber">
                    <FileSpreadsheet size={24} />
                  </span>
                  <h2>Export to Excel</h2>
                  <p>
                    A readable engagement matrix, people, weekly allocations and
                    capacity adjustments for {activeTeam.name}. Includes the
                    full team plan for reimport.
                  </p>
                  <button
 type="button"
                    className="btn"
                    onClick={exportWorkbook}
                    disabled={busy}
                  >
                    <FileSpreadsheet size={16} />
                    Export workbook
                  </button>
                  <small>All project columns are included.</small>
                </section>
              </div>
              {(plan.conflicts?.length ?? 0) > 0 && (
                <section className="card settings-card conflicts-card">
                  <h2>Set aside while merging ({plan.conflicts!.length})</h2>
                  <p className="field-hint">
                    These were changed by someone else at the same time as on this computer. This computer's version is in
                    use; the other one is kept here. Use it to put the other version back, or dismiss it.
                  </p>
                  <ul className="conflict-list">
                    {plan.conflicts!.map((c) => (
                      <li key={c.id}>
                        <span>
                          <b>{c.label}</b>
                          <small>
                            {c.kind === "projects" ? "Project" : c.kind === "people" ? "Person" : c.kind === "assignments" ? "Assignment" : c.kind}
                            {" · "}
                            {c.what} · {new Date(c.at).toLocaleString()}
                          </small>
                        </span>
                        {c.data !== undefined && (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              try {
                                const next = restoreConflict(plan, c.id);
                                patch((p) => {
                                  Object.assign(p, next);
                                  if (!next.conflicts) delete p.conflicts;
                                }, "Other version restored");
                              } catch (e) {
                                notify((e as Error).message);
                              }
                            }}
                          >
                            Use this version
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() =>
                            patch((p) => {
                              p.conflicts = (p.conflicts ?? []).filter((x) => x.id !== c.id);
                              if (!p.conflicts.length) delete p.conflicts;
                            }, "Dismissed")
                          }
                        >
                          Dismiss
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="card settings-card">
                <h2>Workspace information</h2>
                <dl>
                  <div>
                    <dt>Active team</dt>
                    <dd>
                      {activeTeam.name} · {workspace.teams.length} saved teams
                    </dd>
                  </div>
                  <div>
                    <dt>Data source</dt>
                    <dd>{plan.source}</dd>
                  </div>
                  <div>
                    <dt>Records</dt>
                    <dd>
                      {plan.people.length} people · {plan.projects.length}{" "}
                      projects · {plan.assignments.length} assignments
                    </dd>
                  </div>
                  <div>
                    <dt>Planning data</dt>
                    <dd>
                      {plan.allocations.length} weekly allocations ·{" "}
                      {plan.capacityOverrides.length} capacity adjustments
                    </dd>
                  </div>
                  <div>
                    <dt>Storage</dt>
                    <dd>{saveStatus} · This browser and device</dd>
                  </div>
                  <div>
                    <dt>Planning week</dt>
                    <dd>Monday to Sunday</dd>
                  </div>
                </dl>
                <button
 type="button"
                  className="text-btn"
                  onClick={async () => {
                    try {
                      const granted = await navigator.storage?.persist?.();
                      notify(
                        granted
                          ? "Persistent storage enabled. Keep downloading backups."
                          : "The browser did not grant persistent storage. Continue keeping file backups.",
                      );
                    } catch {
                      notify(
                        "Persistent storage is unavailable. Continue keeping file backups.",
                      );
                    }
                  }}
                >
                  <HardDrive size={15} />
                  Request persistent browser storage
                </button>
              </section>
            </>
  );
  const photos = new Map(plan.people.filter((x) => x.photo).map((x) => [x.name, x.photo!] as [string, string]));
  return (
    <PhotoContext.Provider value={photos}>
    <PatchContext.Provider value={patch}>
    <div className="app">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <i className="brand-mark" />
          <span>Team capacity</span>
        </a>
        <button
          className="workspace-switch"
          aria-label={`Switch team, current team: ${teamFullName(plan, activeTeam.name)}`}
          title={teamFullName(plan, activeTeam.name)}
          aria-haspopup="dialog"
          disabled={!ready || busy}
          onClick={() => setTeamDialog("switch")}
        >
          <span className="workspace-mark">{plan.profile?.abbreviation?.trim() ? plan.profile.abbreviation.trim().slice(0, 3) : initials(activeTeam.name)}</span>
          <span className="workspace-team-name">
            <strong>{teamAbbr(plan, activeTeam.name)}</strong>
          </span>
          <ChevronsUpDown size={16} />
        </button>
        <p className="nav-caption">Views</p>
        <nav>
          {nav.filter((n) => track || n.id !== "capacity").map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={view === n.id ? "active" : ""}
            >
              <n.icon size={16} />
              <span>{n.label}</span>
              {n.id === "projects" && <small>{plan.projects.length}</small>}
              {n.id === "shared" && workItemsOf(plan).some((w) => w.status !== "done") && (
                <small>{workItemsOf(plan).filter((w) => w.status !== "done").length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="bottom-nav"
            onClick={() => open({ type: "settings" })}
          >
            <SettingsIcon size={16} />
            Settings
          </button>
          <button className="bottom-nav" onClick={() => open({ type: "help" })}>
            <HelpCircle size={16} />
            Help
          </button>
          <button className="bottom-nav" onClick={() => open({ type: "license" })}>
            <Scale size={16} />
            License
          </button>
          <div className="sidebar-footer">
            <span>Saved in this browser</span>
            <button className="text-btn" onClick={backup}>
              <ArrowDownToLine size={13} />
              Backup
            </button>
          </div>
          <button className="sidebar-credit" onClick={() => open({ type: "license" })} title="About and license">
            © 2026 {AUTHOR} · MIT
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <MoreHorizontal size={20} />
            </button>
            <span className="breadcrumb-team" title={teamFullName(plan, activeTeam.name)}>
              {teamAbbr(plan, activeTeam.name)}
            </span>
            <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === view)?.label ?? "Data & backups"}
            </strong>
          </div>
          <div className="topbar-right">
            <button
              className="icon-btn"
              aria-label={theme === "dark" ? "Use light appearance" : "Use dark appearance"}
              title={theme === "dark" ? "Light appearance" : "Dark appearance"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span
              className={`save-state ${saveStatus === "Save failed" || saveStatus === "Not saved" ? "error" : ""}`}
            >
              <i />
              {saveStatus}
            </span>
            {saveStatus === "Save failed" && (
              <button
                className="text-btn"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry
              </button>
            )}
            {autoMinutes > 0 && autoState === "needs-permission" && (
              <button className="text-btn autosave-warn" onClick={() => void autoSaveNow(true)} title="The browser needs a click before it writes to your auto-save file again">
                Resume auto-save
              </button>
            )}
            {autoMinutes > 0 && autoState === "error" && (
              <button className="text-btn autosave-warn" onClick={() => open({ type: "settings" })}>
                Auto-save failed
              </button>
            )}
            {autoMinutes > 0 && autoState === "ok" && (
              <span className="save-state" title={autoHandle ? `Auto-save file: ${autoHandle.name}` : "Auto-save downloads a copy"}>
                <i />
                File saved {autoLast}
              </span>
            )}
            <button
              className="btn save-team-btn"
              onClick={backup}
              title={`Download ${activeTeam.name} as a JSON file (people, projects, assignments and all settings)`}
            >
              <ArrowDownToLine size={15} />
              Save team
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-btn"
              aria-label="Open help"
              onClick={() => open({ type: "help" })}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>
        <main>
          {(
            <HomeHeader
              now={now}
              name={homePrefs.name}
              teamName={teamAbbr(plan, activeTeam.name)}
              weather={wx.weather}
              weatherState={wx.state}
              onSettings={() => open({ type: "settings", tab: "general" })}
            />
          )}
          <div className="page-header">
            <div>
              <h1>{titles[view]}</h1>
              <p className="page-subtitle">
                {!track && view === "people"
                  ? "Who works on what, and how full each plate is"
                  : !track && view === "overview"
                    ? "What the team works on and where help is needed"
                    : subtitles[view]}
              </p>
            </div>
            <div className="page-actions">
              <div className="export-wrap">
                <button
                  className="btn"
                  onClick={() => setMenu(!menu)}
                  disabled={busy}
                >
                  <Download size={16} />
                  {busy ? "Working…" : "Export"}
                  <ChevronRight className="rotate" size={14} />
                </button>
                {menu && (
                  <div className="dropdown">
                    <button onClick={backup}>
                      <HardDrive size={16} />
                      This team (JSON)
                    </button>
                    <button onClick={backupAllTeams}>
                      <Users size={16} />
                      All teams (JSON)
                    </button>
                    <button onClick={exportWorkbook}>
                      <FileSpreadsheet size={16} />
                      Excel workbook
                    </button>
                  </div>
                )}
              </div>
              <button
                className="btn primary"
                onClick={() => open({ type: "assignment" })}
              >
                <Plus size={17} />
                Add assignment
              </button>
            </div>
          </div>
          {fatal && (
            <div className="alert danger">
              <AlertCircle size={18} />
              <span>{fatal}</span>
              <button className="text-btn" onClick={backup}>
                Download backup
              </button>
            </div>
          )}
          {saveStatus === "Save failed" && (
            <div className="alert danger">
              <AlertCircle size={18} />
              Your latest changes have not been saved. Download a backup or
              retry saving.
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden-input"
            accept=".xlsx,.json"
            aria-label="Import plan"
            onChange={(e) => readFile(e.target.files?.[0])}
          />
          <input
            ref={teamFileRef}
            type="file"
            className="hidden-input"
            accept=".json,application/json"
            aria-label="Load team from JSON file"
            onChange={(e) => void loadTeamFile(e.target.files?.[0])}
          />
          <input
            ref={mergeFileRef}
            type="file"
            className="hidden-input"
            accept=".json,application/json"
            aria-label="Merge a file"
            onChange={(e) => void mergeFile(e.target.files?.[0])}
          />

          {view === "home" && (
            <HomeView
              plan={plan}
              teamName={activeTeam.name}
              today={dateKey(new Date())}
              open={open}
              onEdit={() => open({ type: "settings", tab: "team" })}
              onTeam={() => navigate("people")}
              onProjects={() => navigate("projects")}
              onAnalytics={() => navigate("overview")}
              onStage={(st) => navigate("projects", st)}
              analytics={
                <AnalyticsCards
                  plan={plan}
                  week={week}
                  onStage={(st) => navigate("projects", st)}
                  onTeam={() => navigate("people")}
                />
              }
            />
          )}
          {view === "overview" && (
            <>
              {plan.source === "Starter dummy data" && (
                <div className="setup-banner starter-banner">
                  <div className="setup-icon">
                    <Users size={22} />
                  </div>
                  <div>
                    <strong>A fresh start for {activeTeam.name}</strong>
                    <p>
                      This team started with dummy people, projects and hours.
                      Edit or remove the examples as you build your team.
                    </p>
                  </div>
                  <button className="btn" onClick={() => navigate("people")}>
                    Make it yours <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {!plan.people.length && !plan.projects.length && (
                <section className="card">
                  <Empty
                    title={`Welcome to ${activeTeam.name}`}
                    action={
                      <div className="empty-team-actions">
                        <button
                          className="btn primary"
                          onClick={() => open({ type: "person" })}
                        >
                          <Plus size={16} />
                          Add your first person
                        </button>
                        <button
                          className="btn"
                          onClick={() => open({ type: "project" })}
                        >
                          <FolderKanban size={16} />
                          Add a project
                        </button>
                      </div>
                    }
                  >
                    Start by adding your people and projects, then plan their
                    weekly hours.
                  </Empty>
                </section>
              )}
              {track && (
                <div className="overview-toolbar">
                  <WeekControl />
                </div>
              )}
              <AnalyticsSections prefs={anPrefs} onChange={setAnPrefs} track={track} />
              {anPrefs.show.builder && <AnalyticsBuilder plan={plan} prefs={anPrefs} onChange={setAnPrefs} />}
              {anPrefs.show.glance && (
                <AnalyticsCards
                  plan={plan}
                  week={week}
                  onStage={(st) => navigate("projects", st)}
                  onTeam={() => navigate("people")}
                />
              )}
              {anPrefs.show.involvement && <InvolvementChart plan={plan} open={open} />}
              {plan.people.length > 0 && (missing > 0 || unsetCapacity > 0) && (
                <div className="setup-steps" aria-label="Finish setting up">
                  <span className="setup-title">Finish setting up</span>
                  <button
                    className={`setup-step ${unsetCapacity ? "todo" : "done"}`}
                    onClick={() => open({ type: "team" })}
                  >
                    <span className="step-n">
                      {unsetCapacity ? "1" : <Check size={12} />}
                    </span>
                    <span>
                      <strong>Set capacity</strong>
                      <small>
                        {plan.people.length - unsetCapacity} of{" "}
                        {plan.people.length} people
                      </small>
                    </span>
                  </button>
                  <ChevronRight size={14} className="step-sep" />
                  <button
                    className={`setup-step ${missing ? "todo" : "done"}`}
                    onClick={() => open({ type: "allocation" })}
                  >
                    <span className="step-n">
                      {missing ? "2" : <Check size={12} />}
                    </span>
                    <span>
                      <strong>Estimate hours</strong>
                      <small>
                        {counts.active - missing} of {counts.active} assignments
                      </small>
                    </span>
                  </button>
                  <ChevronRight size={14} className="step-sep" />
                  <button
                    className="setup-step"
                    onClick={() => navigate("capacity")}
                  >
                    <span className="step-n">3</span>
                    <span>
                      <strong>Review load</strong>
                      <small>Capacity, week by week</small>
                    </span>
                  </button>
                </div>
              )}
              {(anPrefs.show.workload || anPrefs.show.summary || anPrefs.show.hours || anPrefs.show.attention) && (
              <div className={`dashboard-grid ${anPrefs.show.workload ? "" : "no-main"}`}>
                {anPrefs.show.workload && (
                <section className="card workload-card">
                  <div className="card-heading">
                    <div>
                      <h2>Team workload</h2>
                      {chartMode === "assignments" && plan.people.length > 0 && (
                        <p className="chart-takeaway">
                          {largestTakeaway(
                            plan.people.map((x) => ({ label: x.name, value: assignmentCounts(plan, x.id).active })),
                            (v) => `${v} active ${v === 1 ? "assignment" : "assignments"}`,
                            false,
                          )}
                        </p>
                      )}
                      <p>
                        {chartMode === "assignments"
                          ? "Ongoing and planned assignments by team member"
                          : `Weekly project hours · ${weekLabel(week, true)}`}
                      </p>
                    </div>
                    {track && (
                    <div className="segmented">
                      <button
                        className={chartMode === "assignments" ? "selected" : ""}
                        onClick={() => setChart("assignments")}
                      >
                        Assignments
                      </button>
                      <button
                        className={chartMode === "hours" ? "selected" : ""}
                        onClick={() => setChart("hours")}
                      >
                        Hours
                      </button>
                    </div>
                    )}
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="dot ongoing" />
                      Ongoing
                    </span>
                    <span>
                      <i className="dot planned" />
                      Planned
                    </span>
                    <span className="chart-unit">
                      {chartMode === "assignments"
                        ? "Number of assignments"
                        : "Hours per week"}
                    </span>
                  </div>
                  <div className="workload-chart">
                    {[...plan.people]
                      .sort(
                        (a, b) =>
                          assignmentCounts(plan, b.id).active -
                          assignmentCounts(plan, a.id).active,
                      )
                      .map((p, i) => {
                        const c = assignmentCounts(plan, p.id),
                          load = personLoad(plan, p.id, week);
                        const one =
                            chartMode === "assignments"
                              ? c.ongoing
                              : load.committed,
                          two =
                            chartMode === "assignments"
                              ? c.planned
                              : load.tentative;
                        const max =
                          chartMode === "assignments"
                            ? Math.max(
                                1,
                                ...plan.people.map(
                                  (p) => assignmentCounts(plan, p.id).active,
                                ),
                              )
                            : Math.max(
                                1,
                                ...plan.people.map((p) => {
                                  const l = personLoad(plan, p.id, week);
                                  return Math.max(l.total, l.capacity ?? 0);
                                }),
                              );
                        return (
                          <button
                            className="chart-row"
                            key={p.id}
                            onClick={() => open({ type: "person", id: p.id })}
                          >
                            <span className="chart-person">
                              <Avatar
                                name={p.name}
                                index={plan.people.indexOf(p)}
                                small
                              />
                              <span>{p.name}</span>
                            </span>
                            <span className="bar-track">
                              <span
                                className="bar ongoing"
                                style={{ width: `${(one / max) * 100}%` }}
                              />
                              <span
                                className="bar planned"
                                style={{ width: `${(two / max) * 100}%` }}
                              />
                              {chartMode === "hours" && load.capacity != null && (
                                <i
                                  className="capacity-tick"
                                  style={{
                                    left: `${(load.capacity / max) * 100}%`,
                                  }}
                                />
                              )}
                            </span>
                            <span className="bar-number">
                              {fmt(one + two)}
                              {chartMode === "hours" ? "h" : ""}
                              {chartMode === "hours" && load.missing > 0 && (
                                <sup title="Some assignments are unestimated">
                                  *
                                </sup>
                              )}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  <div className="card-footer">
                    <span>
                      {chartMode === "assignments"
                        ? "Assignment counts show engagement, not utilisation."
                        : "* Hours are incomplete where assignments are unestimated."}
                    </span>
                    <button
                      className="text-btn"
                      onClick={() => navigate(track ? "capacity" : "matrix")}
                    >
                      {track ? "Open capacity" : "Open engagement"}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                )}
                <div className="dashboard-side">
                  {anPrefs.show.summary && (track ? (
                    <OutlookCard
                      plan={plan}
                      week={week}
                      weeks={plan.settings.weekCount}
                      addWeeks={addWeeks}
                      label={(w) => weekLabel(w)}
                    />
                  ) : (
                    <TasksOverviewCard
                      plan={plan}
                      onPerson={() => navigate("people")}
                    />
                  ))}
                  {anPrefs.show.hours && <HoursByProjectCard plan={plan} week={week} open={open} />}
                  {anPrefs.show.attention && (
                  <section className="card attention-card">
                    <div className="card-heading">
                      <div>
                        <h2>Needs attention</h2>
                        <p>What to review next</p>
                      </div>
                      <span className="attention-count">
                        {Number(missing > 0) +
                          Number(noTasks > 0) +
                          Number(unsetCapacity > 0) +
                          Number(over > 0) +
                          Number(
                            unstaffed.length > 0,
                          ) +
                          Number(stale.length > 0) +
                          Number(overInv > 0
                          )}
                      </span>
                    </div>
                    {unsetCapacity > 0 && (
                      <button
                        className="attention-row"
                        onClick={() => open({ type: "team" })}
                      >
                        <span className="attention-icon">
                          <Users size={16} />
                        </span>
                        <div>
                          <strong>
                            {unsetCapacity} capacity settings missing
                          </strong>
                          <small>Set available project hours</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {missing > 0 && (
                      <button
                        className="attention-row"
                        onClick={() => open({ type: "allocation" })}
                      >
                        <span className="attention-icon">
                          <Clock3 size={16} />
                        </span>
                        <div>
                          <strong>{missing} assignments unestimated</strong>
                          <small>Add hours and planning weeks</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {over > 0 && (
                      <button
                        className="attention-row"
                        onClick={() => navigate("capacity")}
                      >
                        <span className="attention-icon red">
                          <AlertCircle size={16} />
                        </span>
                        <div>
                          <strong>{over} people over capacity</strong>
                          <small>Review the selected week</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {unstaffed.length > 0 && (
                      <button
                        className="attention-row"
                        onClick={() => {
                          navigate("projects", "unstaffed");
                        }}
                      >
                        <span className="attention-icon">
                          <FolderKanban size={16} />
                        </span>
                        <div>
                          <strong>
                            {unstaffed.length}{" "}
                            unstaffed {unstaffed.length === 1 ? "project" : "projects"}
                          </strong>
                          <small>Assign people to the project</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {overInv > 0 && (
                      <button className="attention-row" onClick={() => navigate("people")}>
                        <span className="attention-icon red">
                          <AlertCircle size={16} />
                        </span>
                        <div>
                          <strong>
                            {overInv} {overInv === 1 ? "person is" : "people are"} above their full-plate level
                          </strong>
                          <small>An indication from involvement %, worth a chat</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {stale.length > 0 && (
                      <button className="attention-row" onClick={() => navigate("projects")}>
                        <span className="attention-icon">
                          <CalendarClock size={16} />
                        </span>
                        <div>
                          <strong>
                            {stale.length} {stale.length === 1 ? "project is" : "projects are"} past the end date
                          </strong>
                          <small>
                            {stale.slice(0, 3).map((p) => projectLabel(p)).join(", ")}
                            {stale.length > 3 ? "…" : ""}: extend or mark finished
                          </small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {noTasks > 0 && (
                      <button
                        className="attention-row"
                        onClick={() => navigate("matrix")}
                      >
                        <span className="attention-icon">
                          <ListChecks size={16} />
                        </span>
                        <div>
                          <strong>
                            {noTasks} {noTasks === 1 ? "assignment has" : "assignments have"} no tasks yet
                          </strong>
                          <small>Click a cell in Engagement to add tasks</small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {missing === 0 &&
                      noTasks === 0 &&
                      unsetCapacity === 0 &&
                      over === 0 &&
                      unstaffed.length === 0 &&
                      stale.length === 0 &&
                      overInv === 0 && (
                        <div className="all-clear">
                          <CheckCircle2 />
                          No items to review
                        </div>
                      )}
                  </section>
                  )}
                </div>
              </div>
              )}
            </>
          )}

          {view === "capacity" && !track && (
            <section className="card">
              <Empty
                title="Capacity tracking is off"
                action={
                  <button
                    className="btn primary"
                    onClick={() => open({ type: "settings" })}
                  >
                    <SettingsIcon size={16} />
                    Open Settings
                  </button>
                }
              >
                Weekly hours and capacity are optional. Switch them on in
                Settings if your team wants to plan hours.
              </Empty>
            </section>
          )}
          {view === "capacity" && track && (
            <>
              <div className="view-toolbar">
                <WeekControl />
                <div className="toolbar-right">
                  <select
                    aria-label="Planning horizon"
                    value={plan.settings.weekCount}
                    onChange={(e) =>
                      patch((p) => {
                        p.settings.weekCount = Number(e.target.value);
                      })
                    }
                  >
                    {[4, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} weeks
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn"
                    onClick={() => open({ type: "team" })}
                  >
                    <Settings2 size={15} />
                    Default weekly hours
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => open({ type: "allocation" })}
                  >
                    <Plus size={16} />
                    Plan hours
                  </button>
                </div>
              </div>
              {plan.people.some((p) => p.capacityHours == null) && (
                <form
                  className="default-capacity-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const h = Number(defaultHours);
                    if (!Number.isFinite(h) || h <= 0 || h > 168) return;
                    const n = plan.people.filter(
                      (p) => p.capacityHours == null,
                    ).length;
                    patch((p) => {
                      for (const x of p.people)
                        if (x.capacityHours == null)
                          x.capacityHours = h + (x.reservedHours || 0);
                    }, `Default of ${fmt(h)} h/week set for ${n} ${n === 1 ? "person" : "people"}`);
                  }}
                >
                  <Info size={16} />
                  <span>
                    <strong>
                      {plan.people.filter((p) => p.capacityHours == null).length}{" "}
                      of {plan.people.length}
                    </strong>{" "}
                    people have no default capacity. Set one that applies to
                    every week, then click a week to adjust it.
                  </span>
                  <label>
                    <input
                      type="number"
                      min="0.5"
                      max="168"
                      step="0.5"
                      aria-label="Default project hours per week"
                      value={defaultHours}
                      onChange={(e) => setDefaultHours(e.target.value)}
                    />
                    h / week
                  </label>
                  <button className="btn primary" type="submit">
                    Apply to all without one
                  </button>
                </form>
              )}
              <div className="capacity-summary">
                <span>
                  <i className="dot ongoing" />
                  Committed
                </span>
                <span>
                  <i className="dot planned" />
                  Tentative
                </span>
                <span>
                  <i className="dot overload" />
                  Over capacity
                </span>
                <span>
                  <i className="dot missing" />
                  Incomplete estimate
                </span>
                <span>
                  <i className="dot adjusted" />
                  Week adjusted from default
                </span>
              </div>
              <div className="card table-card">
                <div className="table-search">
                  <Search size={17} />
                  <input
                    placeholder="Find a team member…"
                    aria-label="Find a team member"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span className="grow" />
                  <SortControl
                    sort={capSort}
                    onChange={setCapSort}
                    options={[
                      ["name", "Name"],
                      ["busy", "% busy (first week)"],
                      ["hours", "Hours (first week)"],
                      ["free", "Free hours (first week)"],
                    ]}
                  />
                  <span>{people.length} people</span>
                </div>
                <div className="scroll-table">
                  <table className="capacity-table">
                    <thead>
                      <tr>
                        <th>
                          Person
                        </th>
                        {Array.from(
                          { length: plan.settings.weekCount },
                          (_, i) => addWeeks(week, i),
                        ).map((w, i) => (
                          <th key={w} className={i === 0 ? "current-week" : ""}>
                            {weekLabel(w)}
                            <small>{weekEndLabel(w)}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortBy(
                        people,
                        (p) => {
                          const l = personLoad(plan, p.id, week);
                          return capSort.by === "busy"
                            ? l.utilisation
                            : capSort.by === "free"
                              ? l.capacity == null
                                ? null
                                : l.capacity - l.total
                              : capSort.by === "hours"
                                ? l.total
                                : p.name;
                        },
                        capSort.dir,
                        (p) => p.name,
                      ).map((p) => (
                        <tr key={p.id}>
                          <th>
                            <button
                              className="person-link"
                              onClick={() => open({ type: "person", id: p.id })}
                            >
                              <Avatar
                                name={p.name}
                                index={plan.people.indexOf(p)}
                                small
                              />
                              <span>
                                {p.name}
                                <small>
                                  {p.capacityHours == null
                                    ? "Capacity not set"
                                    : `Default ${fmt(p.capacityHours - p.reservedHours)} h/week`}
                                </small>
                              </span>
                            </button>
                          </th>
                          {Array.from(
                            { length: plan.settings.weekCount },
                            (_, i) => addWeeks(week, i),
                          ).map((w) => {
                            const l = personLoad(plan, p.id, w);
                            const adj = plan.capacityOverrides.find(
                              (o) => o.personId === p.id && o.week === w,
                            );
                            const def =
                              p.capacityHours == null
                                ? null
                                : Math.max(0, p.capacityHours - p.reservedHours);
                            return (
                              <td key={w}>
                                <button
                                  title={
                                    adj
                                      ? `Adjusted: ${fmt(adj.hours)} h this week (default ${def == null ? "not set" : `${fmt(def)} h`})${adj.note ? `. ${adj.note}` : ""}`
                                      : undefined
                                  }
                                  className={`${adj ? "adjusted " : ""}heat-cell ${l.capacity == null ? "unknown" : l.over ? "overload" : l.missing ? "incomplete" : l.total > 0 ? "allocated" : "available"}`}
                                  onClick={() =>
                                    open({
                                      type: "capacity",
                                      personId: p.id,
                                      week: w,
                                    })
                                  }
                                >
                                  {adj && <i className="adjusted-mark" aria-label="Adjusted week" />}
                                  {l.total === 0 && l.capacity != null ? (
                                    <span className="heat-free">
                                      <strong>{fmt(l.capacity)} h</strong>
                                      <small>
                                        {l.capacity === 0 ? "week off" : "available"}
                                      </small>
                                    </span>
                                  ) : l.total === 0 && l.capacity == null ? (
                                    <span
                                      className="heat-empty"
                                      aria-label={l.capacity == null ? "Capacity not set" : "Hours not estimated"}
                                    >
                                      –
                                    </span>
                                  ) : (
                                    <>
                                      <span className="heat-head">
                                        <strong>
                                          {l.missing ? "≥" : ""}
                                          {fmt(l.total)}h
                                        </strong>
                                        <span>
                                          {l.capacity == null
                                            ? l.missing
                                              ? `${l.missing} open`
                                              : ""
                                            : l.over && l.capacity === 0
                                              ? "No capacity"
                                              : l.utilisation != null
                                                ? `${l.missing ? "≥" : ""}${Math.round(l.utilisation * 100)}%`
                                                : ""}
                                        </span>
                                      </span>
                                      {l.capacity != null && (
                                        <span className="heat-track">
                                          <i
                                            className="ongoing"
                                            style={{
                                              width: `${Math.min(100, l.capacity ? (l.committed / l.capacity) * 100 : 0)}%`,
                                            }}
                                          />
                                          <i
                                            className="planned"
                                            style={{
                                              width: `${Math.min(Math.max(0, 100 - (l.capacity ? (l.committed / l.capacity) * 100 : 0)), l.capacity ? (l.tentative / l.capacity) * 100 : 0)}%`,
                                            }}
                                          />
                                        </span>
                                      )}
                                      {l.capacity != null && (
                                        <small className="heat-cap">
                                          of {fmt(l.capacity)} h
                                        </small>
                                      )}
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!people.length && (
                  <Empty title="No matching people">Try another name.</Empty>
                )}
                <div className="card-footer">
                  <span>
                    Click a week to edit its hours or adjust that week’s capacity
                    (holidays, travel, part-time weeks). A dashed outline means
                    estimates are open.
                  </span>
                  <span>Weeks start on Monday</span>
                </div>
              </div>
              <div className="info-note">
                <Info size={17} />
                <p>
                  Planned work is tentative. Utilisation includes ongoing and
                  planned hours. Where estimates are missing, the visible hours
                  are a partial total.
                </p>
              </div>
            </>
          )}

          {view === "matrix" && (
            <>
              <div className="view-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Find a person or project"
                    placeholder="Find a person or project…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="toolbar-right">
                  <span className="legend-item">
                    <i className="dot ongoing" />
                    Ongoing
                  </span>
                  <span className="legend-item">
                    <i className="dot planned" />
                    Planned
                  </span>
                  <span className="legend-item">
                    <i className="dot finished" />
                    Finished
                  </span>
                </div>
              </div>
              <div className="card table-card">
                <div className="scroll-table matrix-scroll">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>
                          TEAM MEMBER
                          <small>
                            {plan.people.length} people · {plan.projects.length}{" "}
                            projects
                          </small>
                        </th>
                        <th className="total-col">ACTIVE</th>
                        {matrixProjects.map((p) => (
                          <th key={p.id}>
                            <button
                              title={p.name}
                              aria-label={`Open ${p.name}`}
                              onClick={() =>
                                open({ type: "projectView", id: p.id })
                              }
                            >
                              {projectLabel(p)}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixPeople.map((p) => (
                        <tr key={p.id}>
                          <th>
                            <button
                              className="person-link"
                              onClick={() => open({ type: "person", id: p.id })}
                            >
                              <Avatar
                                name={p.name}
                                index={plan.people.indexOf(p)}
                                small
                              />
                              <span>{p.name}</span>
                            </button>
                          </th>
                          <td className="total-col">
                            <strong>
                              {assignmentCounts(plan, p.id).active}
                            </strong>
                          </td>
                          {matrixProjects.map((project) => {
                            const a = plan.assignments.find(
                              (a) =>
                                a.personId === p.id &&
                                a.projectId === project.id,
                            );
                            return (
                              <td key={project.id}>
                                <button
                                  aria-label={`${p.name}, ${project.name}: ${a ? a.status + (involvement(a) !== undefined ? `, ${Math.round(involvement(a)!)}%` : "") : "not assigned, click to add"}`}
                                  title={`${p.name} · ${project.name}: ${a ? a.status + (involvement(a) !== undefined ? ` (${Math.round(involvement(a)!)}%)` : "") : "not assigned"}`}
                                  className={`matrix-mark ${a?.status ?? "blank"}`}
                                  onClick={() =>
                                    open({
                                      type: "cell",
                                      personId: p.id,
                                      projectId: project.id,
                                    })
                                  }
                                >
                                  {/* v35: involvement % when set, else a filled (ongoing) or outlined (planned) dot. */}
                                  {a ? (
                                    a.status === "finished" ? (
                                      <Check size={14} />
                                    ) : involvement(a) !== undefined ? (
                                      <span className="mm-pct">{Math.round(involvement(a)!)}%</span>
                                    ) : (
                                      <i className="mm-dot" />
                                    )
                                  ) : (
                                    <Plus size={13} />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer">
                  <span>
                    Click a cell to add, change or remove an assignment.
                  </span>
                  <span>
                    {counts.total} assignments · {counts.active} active
                  </span>
                </div>
              </div>
            </>
          )}

          {view === "projects" && (
            <ProjectsView
              key={filter}
              plan={plan}
              week={week}
              open={open}
              initialStage={filter}
              onAddTeam={(id) => patch((p) => void addWholeTeam(p, id), "Whole team added")}
              onRemove={removeAssignment}
            />
          )}

          {view === "shared" && <SharedWorkView plan={plan} open={open} patch={patch} />}

          {view === "people" && (
            <TeamView plan={plan} week={week} open={open} patch={patch} weekControl={<WeekControl />} teamName={activeTeam.name} />
          )}

          {view === "data" && dataPanel}
          <footer className="page-footer">
            <span>{APP_NAME} {APP_VERSION} · © 2026 {AUTHOR}</span>
            <span>
              <HardDrive size={12} />
              Private workspace · Data stored on this device
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          {removedTeam && !undo && (
            <button
              onClick={() => {
                const r = removedTeam;
                setRemovedTeam(null);
                setWorkspace((w) => restoreTeam(w, r.team, r.index, r.wasActive));
                if (r.wasActive) resetTeamView();
                setToast(`${teamAbbr(r.team.plan, r.team.name)} restored`);
              }}
            >
              <RotateCcw size={14} />
              Undo
            </button>
          )}
          {undo && (
            <button
              onClick={() => {
                const prev = undo;
                setUndo(null);
                setPlan(prev);
                setToast("Change undone");
              }}
            >
              <RotateCcw size={14} />
              Undo
            </button>
          )}
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => {
              setToast("");
              setRemovedTeam(null);
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {guard && (
        <Modal
          title={`Save ${activeTeam.name} first?`}
          eyebrow="UNSAVED CHANGES"
          onClose={() => setGuard(null)}
        >
          <div className="dialog-body">
            <p className="form-intro">
              {activeTeam.name} has changes since its last backup file. Your
              data stays in this browser, but a backup file is the safe copy
              before you {guard.label}.
            </p>
          </div>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setGuard(null)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={() => {
                const g = guard;
                setGuard(null);
                g.run();
              }}
            >
              Continue without saving
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const g = guard;
                backup();
                setGuard(null);
                g.run();
              }}
            >
              <Download size={16} />
              Save backup and continue
            </button>
          </div>
        </Modal>
      )}
      {teamDialog && (
        <TeamDialog
          workspace={workspace}
          initialMode={teamDialog}
          onClose={() => setTeamDialog(null)}
          onSwitch={selectTeam}
          onCreate={createTeam}
          onLoad={() => teamFileRef.current?.click()}
          onSave={backup}
          onMerge={() => mergeFileRef.current?.click()}
          onDemo={addDemoTeam}
          onRemove={deleteTeam}
          onDownload={downloadTeam}
        />
      )}
      {modal?.type === "workspace-import" && modal.workspace && (
        <Modal
          title="Restore all teams?"
          eyebrow="DATA & BACKUPS"
          onClose={() => setModal(null)}
        >
          <div className="dialog-body">
            <p className="form-intro">
              This backup contains {modal.workspace.teams.length} teams. The
              selected team and all planning data will be restored.
            </p>
            <div className="team-list import-team-list">
              {modal.workspace.teams.map((team) => (
                <div className="team-option" key={team.id}>
                  <span className="workspace-mark">{initials(team.name)}</span>
                  <span className="team-option-text">
                    <strong>{teamAbbr(team.plan, team.name)}</strong>
                    <small>
                      {team.plan.people.length} people ·{" "}
                      {team.plan.projects.length} projects
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <div className="alert danger">
              <AlertCircle size={18} />
              <span>
                This replaces all teams in this browser. Download an all-teams
                backup first to keep your current workspace.
              </span>
            </div>
            <button className="text-btn" onClick={backupAllTeams}>
              <Download size={15} />
              Download current all-teams backup
            </button>
          </div>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setWorkspace(modal.workspace!);
                resetTeamView();
                notify("All teams restored");
              }}
            >
              Restore all teams <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal && modal.type !== "workspace-import" && (
        <Editors
          key={`${modal.type}-${modal.tab ?? ""}-${modal.id ?? ""}-${modal.personId ?? ""}-${modal.projectId ?? ""}-${modal.week ?? ""}`}
          modal={modal}
          plan={plan}
          week={week}
          onClose={() => setModal((m) => m?.back ?? null)}
          open={open}
          patch={patch}
          change={change}
          backup={backup}
          notify={notify}
          teamName={activeTeam.name}
          dataPanel={dataPanel}
          autosave={autosave}
        />
      )}
    </div>
    </PatchContext.Provider>
    </PhotoContext.Provider>
  );
}

function TeamDialog({
  workspace,
  initialMode,
  onClose,
  onSwitch,
  onCreate,
  onLoad,
  onSave,
  onMerge,
  onDemo,
  onRemove,
  onDownload,
}: {
  workspace: TeamWorkspace;
  initialMode: "switch" | "create";
  onClose: () => void;
  onSwitch: (id: string) => void;
  onCreate: (name: string, setup: TeamSetup) => void;
  onLoad: () => void;
  onSave: () => void;
  onMerge: () => void;
  onDemo: () => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const only = workspace.teams.length === 1;
  const [name, setName] = useState("");
  const [setup, setSetup] = useState<TeamSetup>("sample");
  const [error, setError] = useState("");
  return (
    <Modal
      title={mode === "switch" ? "Switch or load a team" : "Create a new team"}
      eyebrow="YOUR TEAMS"
      onClose={onClose}
    >
      {mode === "switch" ? (
        <>
          <div className="dialog-body">
            <p className="form-intro">
              Each team has its own people, projects and capacity plan. Pick a team, or load one from a JSON file
              (for example a file a colleague saved on OneDrive).
            </p>
            <div className="team-file-actions">
              <button type="button" className="btn" onClick={onLoad}>
                <Upload size={16} />
                Load team from JSON file
              </button>
              <button type="button" className="btn" onClick={onSave}>
                <Download size={16} />
                Save this team as JSON
              </button>
              <button type="button" className="btn" onClick={onMerge} title="Combine a colleague's saved file with what is here, record by record">
                <GitMerge size={16} />
                Merge a colleague's file
              </button>
              <button type="button" className="btn" onClick={onDemo} title="A fictional team of 24 people to try the app with">
                <Users size={16} />
                Add demo team
              </button>
            </div>
            <div className="team-list">
              {workspace.teams.map((team) => (
                <div className="team-row" key={team.id}>
                <button
                  className={`team-option ${team.id === workspace.activeTeamId ? "selected" : ""}`}
                  onClick={() => onSwitch(team.id)}
                  aria-current={
                    team.id === workspace.activeTeamId ? "true" : undefined
                  }
                >
                  <span className="workspace-mark">{initials(teamAbbr(team.plan, team.name))}</span>
                  <span className="team-option-text">
                    <strong>{teamAbbr(team.plan, team.name)}</strong>
                    <small>
                      {teamFullName(team.plan, team.name) !== teamAbbr(team.plan, team.name) && (
                        <>{teamFullName(team.plan, team.name)} ·{" "}</>
                      )}
                      {team.plan.people.length} people ·{" "}
                      {team.plan.projects.length} projects
                    </small>
                  </span>
                  {team.id === workspace.activeTeamId ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
                <button
                  type="button"
                  className="icon-btn team-remove"
                  aria-label={`Remove ${teamAbbr(team.plan, team.name)} from this browser`}
                  title={only ? "The last team cannot be removed" : "Remove this team from this browser"}
                  disabled={only}
                  aria-expanded={confirmId === team.id}
                  onClick={() => setConfirmId(confirmId === team.id ? null : team.id)}
                >
                  <Trash2 size={16} />
                </button>
                {confirmId === team.id && (
                  <div className="team-remove-confirm" role="group" aria-label={`Remove ${teamAbbr(team.plan, team.name)}`}>
                    <p>
                      Remove <b>{teamAbbr(team.plan, team.name)}</b> from this browser? Its {team.plan.people.length} people,{" "}
                      {team.plan.projects.length} projects and all assignments are deleted here. Files saved on disk or
                      OneDrive are not touched.
                    </p>
                    <div className="team-remove-actions">
                      <button type="button" className="btn" onClick={() => onDownload(team.id)}>
                        <Download size={15} />
                        Download a copy first
                      </button>
                      <button type="button" className="btn" onClick={() => setConfirmId(null)}>
                        Keep it
                      </button>
                      <button
                        type="button"
                        className="btn danger-solid"
                        onClick={() => {
                          setConfirmId(null);
                          onRemove(team.id);
                        }}
                      >
                        <Trash2 size={15} />
                        Remove team
                      </button>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
          <div className="dialog-actions">
            <button className="btn" onClick={onClose}>
              Close
            </button>
            <button className="btn primary" onClick={() => setMode("create")}>
              <Plus size={17} />
              Create new team
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onCreate(name, setup);
            } catch (error) {
              setError((error as Error).message);
            }
          }}
        >
          <div className="dialog-body">
            <label className="field">
              Team name
              <input
                autoFocus
                required
                maxLength={80}
                placeholder="e.g. Research team"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
              />
            </label>
            <fieldset className="team-setup">
              <legend>Choose your starting point</legend>
              <label
                className={`setup-option ${setup === "sample" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="setup"
                  value="sample"
                  checked={setup === "sample"}
                  onChange={() => setSetup("sample")}
                />
                <span>
                  <strong>
                    Start with dummy data{" "}
                    <span className="setup-tag">Recommended</span>
                  </strong>
                  <small>
                    3 example people, 2 projects and four weeks of sample hours.
                    Everything is editable.
                  </small>
                </span>
              </label>
              <label
                className={`setup-option ${setup === "empty" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="setup"
                  value="empty"
                  checked={setup === "empty"}
                  onChange={() => setSetup("empty")}
                />
                <span>
                  <strong>Start empty</strong>
                  <small>
                    A blank team, ready for your own people and projects.
                  </small>
                </span>
              </label>
            </fieldset>
            {error && (
              <div className="form-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setMode("switch")}
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button className="btn primary" type="submit">
              <Plus size={17} />
              Create team
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

interface EditorProps {
  modal: ModalState;
  plan: Plan;
  week: string;
  onClose: () => void;
  open: (m: ModalState) => void;
  patch: (fn: (p: Plan) => void, message?: string) => void;
  change: (p: Plan, message?: string) => void;
  backup: () => void;
  notify: (s: string) => void;
  teamName: string;
  /** Backup, import and export controls, shown in Settings. */
  dataPanel?: React.ReactNode;
  autosave: {
    minutes: number;
    setMinutes: (m: number) => void;
    fileName?: string;
    canPick: boolean;
    state: string;
    last: string;
    choose: () => Promise<void>;
    forget: () => Promise<void>;
    saveNow: () => Promise<void>;
  };
}
/** Connect this assignment's tasks to tasks in other projects: combined work or a dependency. */
function ConnectionsSection({
  plan,
  library,
  projectId,
  tasks,
  rows,
  setRows,
}: {
  plan: Plan;
  library: TaskType[];
  projectId: string;
  tasks: AssignmentTask[];
  rows: { key: string; taskId: string; kind: "with" | "waits"; projectId: string; otherTaskId: string }[];
  setRows: (fn: (r: typeof rows) => typeof rows) => void;
}) {
  const name = (id: string) => library.find((x) => x.id === id)?.name ?? "Task";
  const others = plan.projects.filter((p) => p.id !== projectId && p.status !== "finished" && p.status !== "rejected");
  // Tasks people already do in a project come first; the rest of the library follows.
  const tasksIn = (pid: string) => {
    const used = [...new Set(plan.assignments.filter((a) => a.projectId === pid).flatMap((a) => (a.tasks ?? []).map((t) => t.taskId)))];
    return { used, rest: library.map((t) => t.id).filter((id) => !used.includes(id)) };
  };
  // What the selected tasks are already connected to, through their shared work.
  const current = tasks
    .filter((t) => t.workItemId)
    .map((t) => {
      const w = workItemsOf(plan).find((x) => x.id === t.workItemId);
      if (!w) return null;
      const parts = workItemParts(plan, w.id).filter((x) => x.projectId !== projectId);
      const withs = [...new Set(parts.map((x) => `${x.taskId ? name(x.taskId) + " in " : ""}${plan.projects.find((p) => p.id === x.projectId)?.name ?? ""}`))];
      const waits = blockerLabels(plan, w);
      if (!withs.length && !waits.length) return null;
      return { t, w, withs, waits };
    })
    .filter(Boolean) as { t: AssignmentTask; w: WorkItem; withs: string[]; waits: string[] }[];
  const set = (key: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  return (
    <div className="field conn-section">
      <span>
        Connections to other projects <small className="muted">(optional)</small>
      </span>
      <p className="field-hint">
        Link a task here to a task in another project. <b>Works together</b>: plan them as one piece of work (for
        example an experiment designed around another project's sensors or clamping). <b>Waits on</b>: this task can
        only start when that one is done. Both show on the cards and in Shared work.
      </p>
      {current.length > 0 && (
        <ul className="conn-current">
          {current.map(({ t, w, withs, waits }) => (
            <li key={t.taskId}>
              <b>{name(t.taskId)}</b>
              <span className="muted"> · {w.name}</span>
              {withs.length > 0 && <span> · with {withs.join(", ")}</span>}
              {waits.length > 0 && <span className="waits"> · waits on {waits.join(", ")}</span>}
            </li>
          ))}
        </ul>
      )}
      {rows.map((r) => {
        const { used, rest } = r.projectId ? tasksIn(r.projectId) : { used: [], rest: [] };
        return (
          <div className="conn-row" key={r.key}>
            <select aria-label="Task in this assignment" value={r.taskId} onChange={(e) => set(r.key, { taskId: e.target.value })}>
              <option value="">Task here…</option>
              {tasks.map((t) => (
                <option key={t.taskId} value={t.taskId}>
                  {name(t.taskId)}
                </option>
              ))}
            </select>
            <select aria-label="How they connect" value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value as "with" | "waits" })}>
              <option value="with">works together with</option>
              <option value="waits">waits on</option>
            </select>
            <select aria-label="Other project" value={r.projectId} onChange={(e) => set(r.key, { projectId: e.target.value, otherTaskId: "" })}>
              <option value="">Project…</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select aria-label="Task in the other project" value={r.otherTaskId} disabled={!r.projectId} onChange={(e) => set(r.key, { otherTaskId: e.target.value })}>
              <option value="">{r.kind === "waits" ? "Whole project" : "Any task"}</option>
              {used.length > 0 && (
                <optgroup label="Tasks people do there">
                  {used.map((id) => (
                    <option key={id} value={id}>
                      {name(id)}
                    </option>
                  ))}
                </optgroup>
              )}
              {rest.length > 0 && (
                <optgroup label="Other tasks">
                  {rest.map((id) => (
                    <option key={id} value={id}>
                      {name(id)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button type="button" className="icon-btn" aria-label="Remove this connection" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>
              <X size={16} />
            </button>
          </div>
        );
      })}
      {tasks.length ? (
        <button
          type="button"
          className="text-btn conn-add"
          onClick={() =>
            setRows((x) => [
              ...x,
              { key: uid(), taskId: tasks.length === 1 ? tasks[0].taskId : "", kind: "with", projectId: "", otherTaskId: "" },
            ])
          }
        >
          <Link2 size={14} />
          Connect a task
        </button>
      ) : (
        <p className="field-hint">Pick a task above first.</p>
      )}
    </div>
  );
}

/** Greeting name and weather for the Home header. Saved on this computer and applied at once. */
function HomeSettings() {
  const [prefs, setPrefs] = useState(loadHomePrefs);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<WeatherPlace[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = (p: typeof prefs) => {
    setPrefs(p);
    saveHomePrefs(p);
  };
  const search = async () => {
    setBusy(true);
    setMsg("");
    try {
      const list = await findPlaces(query);
      setFound(list);
      if (!list.length) setMsg("No place found with that name.");
    } catch {
      setFound(null);
      setMsg("Could not reach the weather service. Check the internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="settings-row">
        <div>
          <h3>Your name on Home</h3>
          <p className="field-hint">Used in the greeting ("Good morning, Robert"). Saved on this computer only.</p>
        </div>
        <input
          className="settings-input"
          aria-label="Your name for the greeting"
          value={prefs.name}
          maxLength={60}
          placeholder="First name"
          onChange={(e) => save({ ...prefs, name: e.target.value })}
        />
      </div>
      <div className="settings-row">
        <div>
          <h3>Weather on Home</h3>
          <p className="field-hint">
            Current weather for a place you pick, from Open-Meteo (free, no account). Off by default: when on, the app
            asks open-meteo.com for that place's weather every 30 minutes while Home is open. Only the place is sent,
            never team data. Saved on this computer only.
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={prefs.weather}
            disabled={!prefs.place}
            onChange={(e) => save({ ...prefs, weather: e.target.checked })}
          />
          <span aria-hidden="true" />
          <b>{prefs.weather ? "On" : "Off"}</b>
        </label>
      </div>
      <div className="settings-row settings-sub weather-place">
        <div>
          <h3>Place</h3>
          <p className="field-hint">
            {prefs.place ? (
              <>
                <b>{prefs.place.name}</b>
                {prefs.place.detail ? `, ${prefs.place.detail}` : ""}
              </>
            ) : (
              "Search for a city, then pick it. Weather can be switched on once a place is chosen."
            )}
          </p>
          {found && found.length > 0 && (
            <ul className="place-results">
              {found.map((x) => (
                <li key={`${x.lat},${x.lon}`}>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      save({ ...prefs, place: x, weather: true });
                      setFound(null);
                      setQuery("");
                    }}
                  >
                    {x.name}
                    {x.detail ? <small> {x.detail}</small> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="field-hint warn-text">{msg}</p>}
        </div>
        <div className="place-search">
          <input
            aria-label="City"
            value={query}
            placeholder="City, e.g. Stockholm"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
          <button type="button" className="btn" disabled={busy || query.trim().length < 2} onClick={() => void search()}>
            <Search size={15} />
            {busy ? "Searching…" : "Find"}
          </button>
        </div>
      </div>
    </>
  );
}

function Editors(props: EditorProps) {
  const { modal, plan, onClose, open, patch, change, backup } = props;
  const [error, setError] = useState("");
  const person = plan.people.find((p) => p.id === (modal.id ?? modal.personId));
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(modal.type === "person" ? person?.photo : undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  type ConnRow = { key: string; taskId: string; kind: "with" | "waits"; projectId: string; otherTaskId: string };
  const [connDraft, setConnDraft] = useState<ConnRow[]>([]);
  const [asgProject, setAsgProject] = useState(modal.projectId ?? "");
  const [asgPerson, setAsgPerson] = useState(modal.personId ?? "");
  /** Shown when adding someone already on the project: what saving would change. */
  const [dupConfirm, setDupConfirm] = useState<{ id: string; lines: DiffLine[] } | null>(null);
  const project = plan.projects.find(
    (p) => p.id === (modal.id ?? modal.projectId),
  );
  const [selectedPerson, setSelectedPerson] = useState(
    modal.personId ?? plan.people[0]?.id ?? "",
  );
  const [selectedProject, setSelectedProject] = useState(
    modal.projectId ??
      plan.assignments.find(
        (a) =>
          a.personId === (modal.personId ?? plan.people[0]?.id) &&
          a.status !== "finished",
      )?.projectId ??
      plan.projects.find((p) => p.status !== "finished")?.id ??
      "",
  );
  const [unit, setUnit] = useState("hours");
  const [start, setStart] = useState(modal.week ?? props.week);
  const [end, setEnd] = useState(modal.week ?? props.week);
  const [hours, setHours] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [capacities, setCapacities] = useState(
    plan.people.map((p) => ({
      id: p.id,
      working: p.capacityHours == null ? "" : String(p.capacityHours),
      reserved: String(p.reservedHours),
    })),
  );
  const [applyHours, setApplyHours] = useState("40");
  const existingAssignment =
    modal.type === "cell" || modal.type === "assignment"
      ? plan.assignments.find(
          (a) =>
            a.personId === modal.personId && a.projectId === modal.projectId,
        )
      : undefined;
  const [selTasks, setSelTasks] = useState<AssignmentTask[]>(
    existingAssignment?.tasks ?? [],
  );
  const [libDraft, setLibDraft] = useState<TaskType[]>(taskLibrary(plan));
  const [wiDraft, setWiDraft] = useState<WorkItem[]>(workItemsOf(plan));
  const editItem =
    modal.type === "workitem" && modal.id
      ? workItemsOf(plan).find((w) => w.id === modal.id)
      : undefined;
  const [waitSel, setWaitSel] = useState<string[]>(editItem?.waitsOn ?? []);
  const [wiStatus, setWiStatus] = useState<WorkStatus>(editItem?.status ?? "active");
  type PartRow = { key: string; projectId: string; taskId: string; personId: string; assignmentId?: string; origTask?: string };
  const [partsDraft, setPartsDraft] = useState<PartRow[]>(() =>
    editItem
      ? workItemParts(plan, editItem.id).map((x, i) => ({
          key: `r${i}`,
          projectId: x.projectId,
          taskId: x.taskId ?? "",
          personId: x.personId ?? "",
          assignmentId: x.assignmentId,
          origTask: x.taskId,
        }))
      : [],
  );
  const [waitProj, setWaitProj] = useState<ProjectRef[]>(editItem?.waitsOnProjects ?? []);
  const [trackDraft, setTrackDraft] = useState(tracksCapacity(plan));
  const [overDraft, setOverDraft] = useState<number>(overloadLevel(plan));
  const [datesDraft, setDatesDraft] = useState<ProjectDates>(
    modal.type === "project" && project ? { ...(project.dates ?? {}) } : {},
  );
  const [groupsDraft, setGroupsDraft] = useState<string[]>(
    modal.type === "project" && project ? [...(project.taskGroups ?? [])] : [],
  );
  const [extDraft, setExtDraft] = useState<Extension[]>(
    modal.type === "project" && project ? (project.extensions ?? []).map((x) => ({ ...x })) : [],
  );
  const [msDraft, setMsDraft] = useState<MilestoneDraft[]>(() =>
    modal.type === "project" && project ? toDrafts(project) : [],
  );
  // Points the person chose not to move with a new project end (v23).
  const [shiftOff, setShiftOff] = useState<string[]>([]);
  const draftEnd = () => {
    const e = extDraft.filter((x) => x.end);
    return e.length ? e[e.length - 1].end : datesDraft.end;
  };
  const endPlan = () =>
    endShift(modal.type === "project" && project ? currentEnd(project) : undefined, draftEnd(), msDraft, project?.milestones);
  const [schedDraft, setSchedDraft] = useState<Schedule | undefined>(
    modal.type === "project" && project ? project.schedule : undefined,
  );
  const [periodsDraft, setPeriodsDraft] = useState<TeachingPeriod[]>(periodsOf(plan).map((x) => ({ ...x })));
  const [settingsTab, setSettingsTab] = useState(modal.tab ?? "general");
  const [typesInit] = useState(() => typeOptions(plan));
  const [fundersInit] = useState(() => funderOptions(plan));
  const [typesDraft, setTypesDraft] = useState<ListRow[]>(() => listRows(typesInit));
  const [fundersDraft, setFundersDraft] = useState<ListRow[]>(() => listRows(fundersInit));
  const [stagesInit] = useState(() => stageDefs(plan));
  const [stagesDraft, setStagesDraft] = useState<StageDef[]>(() => stagesInit.map((d) => ({ ...d })));
  const [weeksDraft, setWeeksDraft] = useState(plan.settings.weekCount);
  const [profDraft, setProfDraft] = useState(() => {
    const pr = plan.profile ?? {};
    return {
      abbreviation: pr.abbreviation ?? "",
      fullName: pr.fullName ?? "",
      organisation: pr.organisation ?? "",
      description: pr.description ?? "",
      focus: (pr.focus ?? []).join(", "),
      leadId: pr.leadId && plan.people.some((x) => x.id === pr.leadId) ? pr.leadId : "",
      coordinatorId: pr.coordinatorId && plan.people.some((x) => x.id === pr.coordinatorId) ? pr.coordinatorId : "",
      email: pr.email ?? "",
      website: pr.website ?? "",
    };
  });
  const setProf = (k: keyof typeof profDraft, v: string) => setProfDraft((d) => ({ ...d, [k]: v }));
  const [stageSel, setStageSel] = useState<string>(() =>
    modal.type === "project" && project ? stageKey(project) : modal.type === "project" && modal.kind && modal.kind !== "project" ? "ongoing" : "proposal",
  );
  const [kindSel, setKindSel] = useState<Kind>(
    project && modal.type === "project"
      ? kindOf(project)
      : (modal.kind ?? "project"),
  );
  /** Runs a save; the dialog closes unless the save returns false (it needs another step). */
  const run = (fn: () => void | false) => {
    try {
      if (fn() !== false) onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const field = (
    label: string,
    name: string,
    defaultValue: string | number = "",
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="field">
      {label}
      <input name={name} defaultValue={defaultValue} {...extra} />
    </label>
  );
  const errorView = error && (
    <div className="form-error" role="alert">
      <AlertCircle size={16} />
      {error}
    </div>
  );
  const actions = (label = "Save changes") => (
    <div className="dialog-actions">
      <button type="button" className="btn" onClick={onClose}>
        Cancel
      </button>
      <button className="btn primary" type="submit">
        <Check size={16} />
        {label}
      </button>
    </div>
  );
  if (modal.type === "shortcuts")
    return (
      <Modal title="Keyboard shortcuts" eyebrow="HELP" onClose={onClose}>
        <div className="dialog-body">
          <ShortcutList />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => props.open({ type: "settings", tab: "shortcuts" })}>
            Change in Settings
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  if (modal.type === "license")
    return (
      <Modal title="About and license" eyebrow={`${APP_NAME.toUpperCase()} ${APP_VERSION}`} onClose={onClose}>
        <div className="dialog-body license-body">
          <p className="about-line">
            Made by <strong>{AUTHOR}</strong>,{" "}
            <a href={`mailto:${AUTHOR_EMAIL}`}>{AUTHOR_EMAIL}</a>. Free to use, change and share under the MIT
            License below.
          </p>
          <div className="license-text" tabIndex={0} role="document" aria-label="MIT License text">
            {LICENSE_TEXT.split(/\n\s*\n/).map((para, i) =>
              i === 0 ? <h4 key={i}>{para}</h4> : <p key={i}>{para.replace(/\n/g, " ")}</p>,
            )}
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  if (modal.type === "help")
    return (
      <Modal title="A guide to your workspace" onClose={onClose}>
        <div className="dialog-body help-content">
          <h3>Keyboard shortcuts</h3>
          <p>
            Press <kbd>?</kbd> for the list of shortcuts, for example <kbd>/</kbd> to search, <kbd>A</kbd> to add an
            assignment and <kbd>1</kbd> to <kbd>6</kbd> to move between pages. Change or switch them off in Settings,
            Shortcuts.
          </p>
          <h3>Teams</h3>
          <p>
            The team selector at the top of the menu switches between teams, creates a new one, loads a
            team file a colleague shared, or adds a demo team to try things out. Each team keeps its own
            people, projects and settings.
          </p>
          <h3>People, projects and assignments</h3>
          <p>
            Add people on Team and projects on Projects, then connect them with an assignment: who works
            on what, with a status (planned, ongoing or finished) and optionally an involvement
            percentage and tasks. Engagement shows the whole picture as a grid; click any cell to add or
            change an assignment.
          </p>
          <h3>Reading the indications</h3>
          <p>
            Involvement and workload are indications for conversations, not measurements of anyone's
            effort. Home lists what may need attention, such as projects without people, projects past
            their end date, or someone above the full-plate level set in Settings. Work on finished
            projects no longer counts.
          </p>
          <h3>Hours (optional)</h3>
          <p>
            Weekly hours and the capacity planner are off unless you switch them on in Settings. When
            they are on, planned hours are tentative and ongoing hours committed.
          </p>
          <h3>Sharing with colleagues</h3>
          <p>
            Save the team as a JSON file in a shared folder. In Chrome, Edge, Arc and Opera the app can
            keep writing to that file and merges changes from colleagues record by record. In Safari and
            Firefox each save downloads a copy.
          </p>
          <h3>Keep a backup</h3>
          <p>
            Data is stored in this browser, on this device. Browser data
            deletion removes all local teams. Download all-teams JSON backups
            regularly; you can also export and reimport a complete Excel
            workbook.
          </p>
          <div className="info-note">
            <Info size={17} />
            <p>
              Assignment counts describe involvement. They do not measure hours
              or productivity.
            </p>
          </div>
        </div>
        <div className="dialog-actions">
          <button className="btn primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </Modal>
    );
  if (modal.type === "import" && modal.plan) {
    const incoming = modal.plan;
    return (
      <Modal
        title="Review your import"
        eyebrow="DATA & BACKUPS"
        onClose={onClose}
      >
        <div className="dialog-body">
          <div className="import-stats">
            <div>
              <strong>{incoming.people.length}</strong>
              <span>People</span>
            </div>
            <div>
              <strong>{incoming.projects.length}</strong>
              <span>Projects</span>
            </div>
            <div>
              <strong>{incoming.assignments.length}</strong>
              <span>Assignments</span>
            </div>
          </div>
          {modal.warnings?.map((w, i) => (
            <div className="info-note" key={i}>
              <Info size={17} />
              <p>{w}</p>
            </div>
          ))}
          <div className="alert danger">
            <AlertCircle size={18} />
            <span>
              This replaces the selected team's plan. Other teams are kept.
              Download a backup first if you want to keep this team's current
              plan.
            </span>
          </div>
          <button className="text-btn" onClick={backup}>
            <Download size={15} />
            Download current team backup
          </button>
        </div>
        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              change(incoming, "Team plan imported");
              onClose();
            }}
          >
            Replace team plan
            <ArrowRight size={16} />
          </button>
        </div>
      </Modal>
    );
  }
  if (modal.type === "profile") {
    const pr = plan.profile ?? {};
    const area = (label: string, name: string, value: string, max: number, hint?: string) => (
      <label className="field">
        {label}
        <textarea name={name} defaultValue={value} maxLength={max} rows={4} />
        {hint && <span className="field-hint">{hint}</span>}
      </label>
    );
    return (
      <Modal title="Team details" eyebrow="HOME PAGE" wide onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? "").trim();
            run(() => {
              const next: TeamProfile = {};
              const abbr = get("abbreviation").replace(/\s+/g, " ");
              if (abbr.length > PROFILE_LIMITS.abbreviation)
                throw new Error(`Keep the abbreviation to ${PROFILE_LIMITS.abbreviation} characters.`);
              const email = get("email");
              if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error("Check the contact email.");
              if (abbr) next.abbreviation = abbr;
              for (const k of ["fullName", "organisation", "description", "website"] as const) {
                const v = get(k);
                if (v) next[k] = v;
              }
              if (email) next.email = email;
              const focus = [...new Set(get("focus").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))];
              if (focus.length > 30) throw new Error("Use at most 30 focus areas.");
              if (focus.some((x) => x.length > 100)) throw new Error("Keep each focus area under 100 characters.");
              if (focus.length) next.focus = focus;
              const lead = get("leadId");
              if (lead) next.leadId = lead;
              const coord = get("coordinatorId");
              if (coord) next.coordinatorId = coord;
              patch((p) => {
                if (Object.keys(next).length) p.profile = next;
                else delete p.profile;
              }, "Team details saved");
            });
          }}
        >
          <div className="dialog-body">
            <div className="form-grid">
              {field("Abbreviation (left menu)", "abbreviation", pr.abbreviation ?? "", {
                maxLength: PROFILE_LIMITS.abbreviation,
                placeholder: "e.g. PEM",
              })}
              {field("Full name", "fullName", pr.fullName ?? "", {
                maxLength: PROFILE_LIMITS.fullName,
                placeholder: "e.g. Precision Engineering and Metrology",
              })}
            </div>
            {field("Organisation", "organisation", pr.organisation ?? "", {
              maxLength: PROFILE_LIMITS.organisation,
              placeholder: "Department, school, university",
            })}
            {area("About the team", "description", pr.description ?? "", PROFILE_LIMITS.description)}
            {field("Focus areas", "focus", (pr.focus ?? []).join(", "), {
              maxLength: 3000,
              placeholder: "Separate with commas, e.g. Surface metrology, Machining",
            })}
            <div className="form-grid">
              <label className="field">
                Team lead
                <select name="leadId" defaultValue={pr.leadId && plan.people.some((x) => x.id === pr.leadId) ? pr.leadId : ""}>
                  <option value="">Not set</option>
                  {[...plan.people].sort((a, b) => a.name.localeCompare(b.name)).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              {field("Contact email", "email", pr.email ?? "", { maxLength: PROFILE_LIMITS.email, type: "email" })}
            </div>
            <div className="form-grid">
              <label className="field">
                Team coordinator
                <select name="coordinatorId" defaultValue={pr.coordinatorId && plan.people.some((x) => x.id === pr.coordinatorId) ? pr.coordinatorId : ""}>
                  <option value="">Same as the team lead</option>
                  {[...plan.people].sort((a, b) => a.name.localeCompare(b.name)).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {field("Website", "website", pr.website ?? "", { maxLength: PROFILE_LIMITS.website, placeholder: "e.g. www.example.org/team" })}
            <p className="field-hint">
              The abbreviation names the team in the left menu and the team list; the full name heads the Home
              page. Leave them empty to use "{props.teamName}". Everything here is saved with the team and in its
              backups.
            </p>
            {errorView}
          </div>
          {actions()}
        </form>
      </Modal>
    );
  }
  if (modal.type === "settings")
    return (
      <Modal title="Settings" eyebrow="THIS TEAM" wide onClose={onClose}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => {
              const names = libDraft.map((t) => t.name.trim().toLowerCase());
              if (names.some((n) => !n))
                throw new Error("Every task needs a name.");
              if (new Set(names).size !== names.length)
                throw new Error("Two tasks have the same name.");
              const pn = periodsDraft.map((x) => x.name.trim().toLowerCase());
              if (periodsDraft.some((x) => !x.name.trim() || !x.start || !x.end))
                throw new Error("Every teaching period needs a name, a start and an end.");
              if (periodsDraft.some((x) => x.start > x.end))
                throw new Error("A teaching period ends before it starts.");
              if (new Set(pn).size !== pn.length) throw new Error("Two teaching periods have the same name.");
              const lists = (rows: ListRow[], what: string) => {
                const names = rows.map((r) => r.name.trim().replace(/\s+/g, " ")).filter(Boolean);
                const low = names.map((x) => x.toLowerCase());
                if (new Set(low).size !== low.length) {
                  setSettingsTab("lists");
                  throw new Error(`Two ${what} have the same name.`);
                }
                return cleanList(names);
              };
              const typesOut = lists(typesDraft, "project types");
              const fundersOut = lists(fundersDraft, "funders");
              const stLabels = stagesDraft.map((d) => (d.label.trim() || (d.like ? "" : builtinStageLabel(d.id))).toLowerCase());
              if (stagesDraft.some((d, i) => d.like && !stLabels[i])) {
                setSettingsTab("lists");
                throw new Error("Every stage you add needs a name.");
              }
              if (new Set(stLabels).size !== stLabels.length) {
                setSettingsTab("lists");
                throw new Error("Two stages have the same name.");
              }
              const typesChanged = JSON.stringify(typesOut) !== JSON.stringify(typesInit) || typesDraft.some((r) => r.orig && r.name.trim() !== r.orig);
              const fundersChanged = JSON.stringify(fundersOut) !== JSON.stringify(fundersInit) || fundersDraft.some((r) => r.orig && r.name.trim() !== r.orig);
              const stagesOut: StageDef[] = stagesDraft.map((d) => {
                const x: StageDef = { id: d.id, label: d.label.trim().slice(0, 80) };
                if (d.like) x.like = d.like;
                if (d.hidden) x.hidden = true;
                return x;
              });
              const stagesDefault =
                stagesOut.length === projectStatuses.length &&
                stagesOut.every((d, i) => d.id === projectStatuses[i] && !d.hidden && d.label === builtinStageLabel(d.id));
              const prof: TeamProfile = {};
              const abbr = profDraft.abbreviation.trim().replace(/\s+/g, " ");
              if (abbr.length > PROFILE_LIMITS.abbreviation) {
                setSettingsTab("team");
                throw new Error(`Keep the abbreviation to ${PROFILE_LIMITS.abbreviation} characters.`);
              }
              const email = profDraft.email.trim();
              if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) {
                setSettingsTab("team");
                throw new Error("Check the team's contact email.");
              }
              if (abbr) prof.abbreviation = abbr;
              for (const k of ["fullName", "organisation", "description", "website"] as const)
                if (profDraft[k].trim()) prof[k] = profDraft[k].trim();
              if (email) prof.email = email;
              const focus = [...new Set(profDraft.focus.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30).map((x) => x.slice(0, 100));
              if (focus.length) prof.focus = focus;
              if (profDraft.leadId) prof.leadId = profDraft.leadId;
              if (profDraft.coordinatorId) prof.coordinatorId = profDraft.coordinatorId;
              patch((p) => {
                if (Object.keys(prof).length) p.profile = prof;
                else delete p.profile;
                p.settings.weekCount = weeksDraft;
                if (overDraft !== OVERLOAD_DEFAULT && overDraft >= 10 && overDraft <= PERCENT_MAX) p.settings.overloadPercent = Math.round(overDraft);
                else delete p.settings.overloadPercent;
                if (trackDraft) p.settings.capacityTracking = true;
                else delete p.settings.capacityTracking;
                const per = periodsDraft.map((x) => ({ id: x.id, name: x.name.trim(), start: x.start, end: x.end }));
                if (per.length) p.settings.periods = per;
                else delete p.settings.periods;
                const pids = new Set(per.map((x) => x.id));
                for (const pr of p.projects)
                  if (pr.schedule?.periodIds) {
                    pr.schedule.periodIds = pr.schedule.periodIds.filter((id) => pids.has(id));
                    if (!pr.schedule.periodIds.length) delete pr.schedule.periodIds;
                  }
                const lib = libDraft.map((t) => {
                  const x: TaskType = { id: t.id, name: t.name.trim() };
                  if (t.category && t.category.trim()) x.category = t.category.trim();
                  if (t.color) x.color = t.color;
                  return x;
                });
                const same =
                  JSON.stringify(lib) === JSON.stringify(DEFAULT_TASKS);
                if (same) delete p.taskLibrary;
                else p.taskLibrary = lib;
                const ids = new Set(lib.map((t) => t.id));
                for (const a of p.assignments)
                  if (a.tasks) {
                    a.tasks = a.tasks.filter((t) => ids.has(t.taskId));
                    if (!a.tasks.length) delete a.tasks;
                  }
                for (const w of p.workItems ?? [])
                  for (const r of [...(w.links ?? []), ...(w.waitsOnProjects ?? [])])
                    if (r.taskId && !ids.has(r.taskId)) delete r.taskId;
                // Project lists: renaming a type or funder renames it on the projects too.
                const applyList = (field: "type" | "funder", rows: ListRow[], out: string[], changed: boolean) => {
                  if (!changed) return;
                  for (const r of rows) {
                    const to = r.name.trim().replace(/\s+/g, " ");
                    if (r.orig && to && to !== r.orig) renameOnProjects(p, field, r.orig, to);
                  }
                  const key = field === "type" ? "projectTypes" : "funders";
                  if (field === "type" && JSON.stringify(out) === JSON.stringify(DEFAULT_TYPES)) delete p.settings.projectTypes;
                  else if (out.length) p.settings[key] = out;
                  else p.settings[key] = [];
                  if (field === "funder" && !out.length) delete p.settings.funders;
                };
                applyList("type", typesDraft, typesOut, typesChanged);
                applyList("funder", fundersDraft, fundersOut, fundersChanged);
                if (stagesDefault) delete p.settings.stages;
                else p.settings.stages = stagesOut;
                const own = new Map(stagesOut.filter((d) => d.like).map((d) => [d.id, d.like as ProjectStatus]));
                for (const pr of p.projects)
                  if (pr.stage) {
                    const like = own.get(pr.stage);
                    if (!like) delete pr.stage;
                    else pr.status = like;
                  }
              }, "Settings saved");
            });
          }}
        >
          <div className="settings-tabs" role="tablist" aria-label="Settings sections">
            {(
              [
                ["general", "General"],
                ["team", "Team details"],
                ["periods", "Teaching periods", periodsDraft.length],
                ["tasks", "Task library", libDraft.length],
                ["lists", "Project lists"],
                ["saving", "Data and backups"],
                ["appearance", "Appearance"],
                ["shortcuts", "Shortcuts"],
              ] as [string, string, number?][]
            ).map(([id, label, n]) => (
              <button
                type="button"
                role="tab"
                key={id}
                id={`set-tab-${id}`}
                aria-selected={settingsTab === id}
                aria-controls={`set-panel-${id}`}
                className={settingsTab === id ? "on" : ""}
                onClick={() => setSettingsTab(id)}
              >
                {label}
                {n != null && <b>{n}</b>}
                {id === "saving" && props.autosave.minutes > 0 && <i className="tab-dot" aria-label="on" />}
              </button>
            ))}
          </div>
          <div className="dialog-body settings-body">
            <section className="settings-section" role="tabpanel" id="set-panel-appearance" aria-labelledby="set-tab-appearance" hidden={settingsTab !== "appearance"}>
              <h3>Colour palette</h3>
              <PaletteSettings theme={document.documentElement.dataset.theme === "light" ? "light" : "dark"} />
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-shortcuts" aria-labelledby="set-tab-shortcuts" hidden={settingsTab !== "shortcuts"}>
              <h3>Keyboard shortcuts</h3>
              <ShortcutSettings />
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-team" aria-labelledby="set-tab-team" hidden={settingsTab !== "team"}>
              <h3>Team details</h3>
              <p className="field-hint">
                Shown on the Home page. The abbreviation names the team in the left menu and the team list. Leave
                the names empty to use "{props.teamName}".
              </p>
              <div className="form-grid">
                <label className="field">
                  Abbreviation (left menu)
                  <input value={profDraft.abbreviation} maxLength={PROFILE_LIMITS.abbreviation} placeholder="e.g. PEM" onChange={(e) => setProf("abbreviation", e.target.value)} />
                </label>
                <label className="field">
                  Full name
                  <input value={profDraft.fullName} maxLength={PROFILE_LIMITS.fullName} placeholder="e.g. Precision Engineering and Metrology" onChange={(e) => setProf("fullName", e.target.value)} />
                </label>
              </div>
              <label className="field">
                Organisation
                <input value={profDraft.organisation} maxLength={PROFILE_LIMITS.organisation} placeholder="Department, school, university" onChange={(e) => setProf("organisation", e.target.value)} />
              </label>
              <label className="field">
                About the team
                <textarea rows={4} value={profDraft.description} maxLength={PROFILE_LIMITS.description} onChange={(e) => setProf("description", e.target.value)} />
              </label>
              <label className="field">
                Focus areas
                <input value={profDraft.focus} maxLength={3000} placeholder="Separate with commas, e.g. Surface metrology, Machining" onChange={(e) => setProf("focus", e.target.value)} />
              </label>
              <div className="form-grid">
                <label className="field">
                  Team lead
                  <select value={profDraft.leadId} onChange={(e) => setProf("leadId", e.target.value)}>
                    <option value="">Not set</option>
                    {[...plan.people].sort((a, b) => a.name.localeCompare(b.name)).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Team coordinator
                  <select value={profDraft.coordinatorId} onChange={(e) => setProf("coordinatorId", e.target.value)}>
                    <option value="">Same as the team lead</option>
                    {[...plan.people].sort((a, b) => a.name.localeCompare(b.name)).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Contact email
                  <input type="email" value={profDraft.email} maxLength={PROFILE_LIMITS.email} onChange={(e) => setProf("email", e.target.value)} />
                </label>
              </div>
              <label className="field">
                Website
                <input value={profDraft.website} maxLength={PROFILE_LIMITS.website} placeholder="e.g. www.example.org/team" onChange={(e) => setProf("website", e.target.value)} />
              </label>
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-general" aria-labelledby="set-tab-general" hidden={settingsTab !== "general"}>
              <div className="settings-row">
                <div>
                  <h3>Capacity tracking</h3>
                  <p className="field-hint">
                    Weekly hours, capacity and % busy. Off by default: the team
                    sees tasks and a self-set status ("Full plate", "Steady",
                    "Has room") instead. Switching it off hides hours but keeps
                    them, so nothing is lost.
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={trackDraft}
                    onChange={(e) => setTrackDraft(e.target.checked)}
                  />
                  <span aria-hidden="true" />
                  <b>{trackDraft ? "On" : "Off"}</b>
                </label>
              </div>
              {trackDraft && (
                <div className="settings-row settings-sub">
                  <div>
                    <h3>Weeks in the capacity planner</h3>
                    <p className="field-hint">How many weeks the Capacity grid shows at once.</p>
                  </div>
                  <select aria-label="Weeks shown" value={weeksDraft} onChange={(e) => setWeeksDraft(Number(e.target.value))}>
                    {[4, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} weeks
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="settings-row">
                <div>
                  <h3>Involvement warning level</h3>
                  <p className="field-hint">
                    When a person's involvement across projects goes above this, their card shows a gentle warning. It is only an
                    indication: each person can set their own level ("My plate is full at") in their details.
                  </p>
                </div>
                <span className="pct-input big">
                  <input
                    type="number"
                    min={10}
                    max={PERCENT_MAX}
                    step={5}
                    aria-label="Involvement warning level in percent"
                    value={overDraft}
                    onChange={(e) => setOverDraft(Number(e.target.value) || OVERLOAD_DEFAULT)}
                  />
                  <span>%</span>
                </span>
              </div>
              <HomeSettings />
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-saving" aria-labelledby="set-tab-saving" hidden={settingsTab !== "saving"}>
              <div className="settings-row">
                <div>
                  <h3>Auto-save to a file</h3>
                  <p className="field-hint">
                    {props.autosave.canPick
                      ? "Saves all teams to a JSON file you choose, for example in OneDrive, at the interval below and only when something changed. Restore it below with Choose a file. Applies right away on this computer."
                      : "This browser cannot write to a chosen file (Safari and Firefox), so auto-save downloads a copy to your Downloads folder at the interval below, only when something changed. For one file that is overwritten, use Chrome, Edge, Arc or Opera."}
                  </p>
                </div>
                <select
                  aria-label="Auto-save interval"
                  value={props.autosave.minutes}
                  onChange={(e) => props.autosave.setMinutes(Number(e.target.value))}
                >
                  <option value={0}>Off</option>
                  {[1, 2, 5, 10, 15, 30, 60].map((m) => (
                    <option key={m} value={m}>
                      Every {m} min
                    </option>
                  ))}
                </select>
              </div>
              {props.autosave.canPick && (
                <div className="row-actions autosave-row">
                  {props.autosave.fileName ? (
                    <span>
                      File: <b>{props.autosave.fileName}</b>
                      {props.autosave.last && <span className="muted"> · last saved {props.autosave.last}</span>}
                      {props.autosave.state === "needs-permission" && (
                        <span className="danger-text"> · needs your OK to write again</span>
                      )}
                      {props.autosave.state === "error" && <span className="danger-text"> · last save failed</span>}
                    </span>
                  ) : (
                    <span className="muted">No file chosen yet.</span>
                  )}
                  <button type="button" className="btn" onClick={() => void props.autosave.choose()}>
                    <Download size={15} />
                    {props.autosave.fileName ? "Choose another file" : "Choose file"}
                  </button>
                  {props.autosave.fileName && (
                    <>
                      <button type="button" className="text-btn" onClick={() => void props.autosave.saveNow()}>
                        Merge and save now
                      </button>
                      <button type="button" className="text-btn" onClick={() => void props.autosave.forget()}>
                        Forget file
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
            <section className="settings-section settings-data" aria-labelledby="set-tab-saving" hidden={settingsTab !== "saving"}>
              {props.dataPanel}
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-periods" aria-labelledby="set-tab-periods" hidden={settingsTab !== "periods"}>
              <div className="section-heading">
                <h3>Teaching periods</h3>
              </div>
              <p className="field-hint">
                Define your academic periods once (for example Period 1 with its dates). Teaching
                activities then pick one or more periods.
              </p>
              <div className="part-rows">
                {periodsDraft.map((x, i) => (
                  <div className="period-row" key={x.id}>
                    <input
                      aria-label="Period name"
                      placeholder={`Period ${i + 1}`}
                      maxLength={80}
                      value={x.name}
                      onChange={(e) =>
                        setPeriodsDraft((l) => l.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)))
                      }
                    />
                    <input
                      type="date"
                      aria-label={`${x.name || "Period"} start`}
                      value={x.start}
                      onChange={(e) =>
                        setPeriodsDraft((l) => l.map((y) => (y.id === x.id ? { ...y, start: e.target.value } : y)))
                      }
                    />
                    <input
                      type="date"
                      aria-label={`${x.name || "Period"} end`}
                      value={x.end}
                      onChange={(e) =>
                        setPeriodsDraft((l) => l.map((y) => (y.id === x.id ? { ...y, end: e.target.value } : y)))
                      }
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${x.name || "period"}`}
                      title={
                        plan.projects.some((pr) => pr.schedule?.periodIds?.includes(x.id))
                          ? "Used by teaching activities; they lose this period"
                          : undefined
                      }
                      onClick={() => setPeriodsDraft((l) => l.filter((y) => y.id !== x.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      setPeriodsDraft((l) => {
                        const last = l[l.length - 1];
                        let start = "", end = "";
                        if (last?.end) {
                          const d = parseDate(last.end);
                          d.setDate(d.getDate() + 1);
                          start = dateKey(d);
                        }
                        return [...l, { id: `p-${uid().slice(0, 8)}`, name: `Period ${l.length + 1}`, start, end }];
                      })
                    }
                  >
                    <Plus size={14} />
                    Add period
                  </button>
                </div>
              </div>
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-tasks" aria-labelledby="set-tab-tasks" hidden={settingsTab !== "tasks"}>
              <div className="section-heading">
                <h3>Task library</h3>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setLibDraft(DEFAULT_TASKS)}
                >
                  Reset to defaults
                </button>
              </div>
              <p className="field-hint">
                Tasks people pick when they are assigned to a project or
                activity. Removing a task also removes it from assignments.
              </p>
              <div className="lib-table">
                <div className="lib-head">
                  <span>Task</span>
                  <span>Category</span>
                  <span>Colour</span>
                  <span>In use</span>
                  <span />
                </div>
                {libDraft.map((t, i) => {
                  const used = plan.assignments.filter((a) =>
                    a.tasks?.some((x) => x.taskId === t.id),
                  ).length;
                  const upd = (k: keyof TaskType, v: string) =>
                    setLibDraft((l) =>
                      l.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
                    );
                  return (
                    <div className="lib-row" key={t.id}>
                      <input
                        aria-label="Task name"
                        value={t.name}
                        maxLength={80}
                        onChange={(e) => upd("name", e.target.value)}
                      />
                      <input
                        aria-label="Category"
                        value={t.category ?? ""}
                        maxLength={40}
                        placeholder="e.g. Lab"
                        list="task-cats"
                        onChange={(e) => upd("category", e.target.value)}
                      />
                      <span className="swatches" role="radiogroup" aria-label="Colour">
                        {TASK_COLORS.map((c) => (
                          <button
                            type="button"
                            key={c}
                            role="radio"
                            aria-checked={t.color === c}
                            aria-label={c}
                            className={`swatch t-${c} ${t.color === c ? "on" : ""}`}
                            onClick={() => upd("color", c)}
                          />
                        ))}
                      </span>
                      <span className="muted">{used || "–"}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remove ${t.name}`}
                        onClick={() =>
                          setLibDraft((l) => l.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                <datalist id="task-cats">
                  {[...new Set(libDraft.map((t) => t.category).filter(Boolean))].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setLibDraft((l) => [...l, newTaskType("New task", l)])
                }
              >
                <Plus size={15} />
                Add task
              </button>
            </section>
            <section className="settings-section" role="tabpanel" id="set-panel-lists" aria-labelledby="set-tab-lists" hidden={settingsTab !== "lists"}>
              <h3>Project lists</h3>
              <p className="field-hint">
                The choices in the Projects filters and in the project form. Renaming an entry renames it on every
                project that uses it. Removing one leaves those projects as they are, and it stays in the filters while
                a project still uses it.
              </p>
              <div className="plist-group">
                <div className="section-heading">
                  <h4>Project types</h4>
                  <button type="button" className="text-btn" onClick={() => setTypesDraft(listRows(typeOptions({ ...plan, settings: { ...plan.settings, projectTypes: undefined } })))}>
                    Reset to defaults
                  </button>
                </div>
                <NameListEditor
                  rows={typesDraft}
                  setRows={setTypesDraft}
                  used={(n) => plan.projects.filter((x) => x.type === n).length}
                  what="Type"
                  placeholder="e.g. Research"
                />
              </div>
              <div className="plist-group">
                <div className="section-heading">
                  <h4>Funders</h4>
                </div>
                <NameListEditor
                  rows={fundersDraft}
                  setRows={setFundersDraft}
                  used={(n) => plan.projects.filter((x) => x.funder === n).length}
                  what="Funder"
                  placeholder="e.g. Vinnova"
                />
              </div>
              <div className="plist-group">
                <div className="section-heading">
                  <h4>Stages</h4>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      setStagesDraft((l) => [
                        ...projectStatuses.map((id) => ({ id, label: builtinStageLabel(id) })),
                        ...l.filter((d) => d.like && plan.projects.some((x) => x.stage === d.id)),
                      ])
                    }
                  >
                    Reset to defaults
                  </button>
                </div>
                <p className="field-hint">
                  The built-in stages drive the timeline and charts, so they can be renamed, reordered or hidden but
                  not removed. A stage you add works like one of them (for example "Under negotiation" works like
                  Submitted). Hidden stages are left out of the stage picker; projects already in one keep it.
                </p>
                <div className="plist">
                  {stagesDraft.map((d, i) => {
                    const n = plan.projects.filter((x) => stageKey(x) === d.id).length;
                    const upd = (patchD: Partial<StageDef>) =>
                      setStagesDraft((l) => l.map((x, j) => (j === i ? { ...x, ...patchD } : x)));
                    const move = (k: number) =>
                      setStagesDraft((l) => {
                        const j = i + k;
                        if (j < 0 || j >= l.length) return l;
                        const c = [...l];
                        [c[i], c[j]] = [c[j], c[i]];
                        return c;
                      });
                    return (
                      <div className={`plist-row stage-row${d.hidden ? " is-hidden" : ""}`} key={d.id}>
                        <span className="plist-num">{i + 1}</span>
                        <input
                          aria-label="Stage name"
                          value={d.label}
                          maxLength={80}
                          placeholder={d.like ? "e.g. Under negotiation" : builtinStageLabel(d.id)}
                          onChange={(e) => upd({ label: e.target.value })}
                        />
                        {d.like ? (
                          <label className="stage-like">
                            <span>works like</span>
                            <select
                              aria-label="Works like"
                              value={d.like}
                              onChange={(e) => upd({ like: e.target.value as ProjectStatus })}
                            >
                              {projectStatuses.map((s0) => (
                                <option key={s0} value={s0}>
                                  {builtinStageLabel(s0)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <span className="stage-like muted">
                            {d.label.trim() && d.label.trim() !== builtinStageLabel(d.id) ? `built-in: ${builtinStageLabel(d.id)}` : "built-in"}
                          </span>
                        )}
                        <span className="plist-use">{n ? `${n} in use` : "not used"}</span>
                        <span className="plist-move">
                          <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(-1)}>
                            <ChevronUp size={14} />
                          </button>
                          <button type="button" className="icon-btn" aria-label="Move down" disabled={i === stagesDraft.length - 1} onClick={() => move(1)}>
                            <ChevronDown size={14} />
                          </button>
                        </span>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={d.hidden ? `Show ${d.label}` : `Hide ${d.label}`}
                          aria-pressed={!!d.hidden}
                          title={d.hidden ? "Hidden from the stage picker" : "Hide from the stage picker"}
                          onClick={() => upd({ hidden: !d.hidden })}
                        >
                          {d.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {d.like ? (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Remove ${d.label || "stage"}`}
                            title={n ? `Its ${n} project${n > 1 ? "s" : ""} go back to ${builtinStageLabel(d.like)}` : undefined}
                            onClick={() => setStagesDraft((l) => l.filter((_, j) => j !== i))}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="plist-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={stagesDraft.length >= LIST_MAX}
                    onClick={() =>
                      setStagesDraft((l) => [...l, { id: `s-${uid().slice(0, 8)}`, label: "", like: "submitted" }])
                    }
                  >
                    <Plus size={15} />
                    Add stage
                  </button>
                </div>
              </div>
            </section>
            {errorView}
          </div>
          {actions("Save settings")}
        </form>
      </Modal>
    );
  if (modal.type === "team")
    return (
      <Modal
        title="Set team capacity"
        eyebrow="CAPACITY SETTINGS"
        wide
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => {
              const next = clone(plan);
              for (const c of capacities) {
                const p = next.people.find((p) => p.id === c.id)!;
                const working = c.working === "" ? null : Number(c.working),
                  reserved = Number(c.reserved);
                if (
                  (working != null &&
                    (!Number.isFinite(working) ||
                      working < 0 ||
                      working > 168)) ||
                  !Number.isFinite(reserved) ||
                  reserved < 0 ||
                  reserved > 168 ||
                  (working != null && reserved > working)
                )
                  throw new Error(
                    `Check working and reserved hours for ${p.name}.`,
                  );
                p.capacityHours = working;
                p.reservedHours = reserved;
              }
              change(next, "Team capacity updated");
            });
          }}
        >
          <div className="dialog-body">
            <p className="form-intro">
              Enter normal weekly hours. Reserve time for non-project work.
              Leave working hours blank when capacity is unknown.
            </p>
            <div className="bulk-capacity">
              <label>
                Set working hours for everyone
                <input
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  value={applyHours}
                  onChange={(e) => setApplyHours(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (
                    applyHours !== "" &&
                    Number(applyHours) >= 0 &&
                    Number(applyHours) <= 168
                  )
                    setCapacities((cs) =>
                      cs.map((c) => ({ ...c, working: applyHours })),
                    );
                }}
              >
                Apply to all
              </button>
            </div>
            <div className="capacity-input-table">
              <div className="capacity-input-head">
                <span>TEAM MEMBER</span>
                <span>WORKING h/wk</span>
                <span>RESERVED h/wk</span>
                <span>PROJECT h/wk</span>
              </div>
              {capacities.map((c, i) => (
                <div className="capacity-input-row" key={c.id}>
                  <span>
                    <Avatar name={plan.people[i].name} index={i} small />
                    {plan.people[i].name}
                  </span>
                  <input
                    aria-label={`Working hours for ${plan.people[i].name}`}
                    type="number"
                    min="0"
                    max="168"
                    step="0.5"
                    placeholder="Unknown"
                    value={c.working}
                    onChange={(e) =>
                      setCapacities((cs) =>
                        cs.map((x) =>
                          x.id === c.id ? { ...x, working: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Reserved hours for ${plan.people[i].name}`}
                    type="number"
                    min="0"
                    max="168"
                    step="0.5"
                    value={c.reserved}
                    onChange={(e) =>
                      setCapacities((cs) =>
                        cs.map((x) =>
                          x.id === c.id
                            ? { ...x, reserved: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  <strong>
                    {c.working === ""
                      ? "—"
                      : fmt(
                          Math.max(0, Number(c.working) - Number(c.reserved)),
                        )}
                  </strong>
                </div>
              ))}
            </div>
            {errorView}
          </div>
          {actions("Save team capacity")}
        </form>
      </Modal>
    );
  if (modal.type === "person")
    return (
      <Modal
        title={person ? person.name : "Add a team member"}
        eyebrow="PEOPLE"
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              const name = String(f.get("name")).trim(),
                raw = String(f.get("working")),
                working = raw === "" ? null : Number(raw),
                reserved = Number(f.get("reserved"));
              const fullRaw = String(f.get("fullAt") ?? "").trim();
              const fullAt = fullRaw === "" ? undefined : Math.round(Number(fullRaw));
              if (fullAt !== undefined && !(Number.isFinite(fullAt) && fullAt >= 10 && fullAt <= PERCENT_MAX))
                throw new Error(`A full plate level must be between 10 and ${PERCENT_MAX}%.`);
              if (!name) throw new Error("Enter a name.");
              if (
                plan.people.some(
                  (p) =>
                    p.id !== person?.id &&
                    p.name.toLowerCase() === name.toLowerCase(),
                )
              )
                throw new Error("A person with this name already exists.");
              if (working != null && reserved > working)
                throw new Error("Reserved hours cannot exceed working hours.");
              patch(
                (p) => {
                  const role = String(f.get("role") ?? "").trim();
                  const record = {
                    ...(person ?? {}),
                    id: person?.id ?? uid(),
                    name,
                    capacityHours: working,
                    reservedHours: reserved,
                    notes: String(f.get("notes")),
                    role: role || undefined,
                    photo: photoDraft,
                    fullAt,
                  };
                  if (!record.role) delete record.role;
                  if (record.fullAt === undefined) delete record.fullAt;
                  if (!record.photo) delete record.photo;
                  if (person)
                    p.people = p.people.map((x) =>
                      x.id === person.id ? record : x,
                    );
                  else p.people.push(record);
                },
                person ? "Person updated" : "Person added",
              );
            });
          }}
        >
          <div className="dialog-body">
            <div className="form-grid">
              {field("Full name", "name", person?.name ?? "", {
                required: true,
                maxLength: 500,
              })}
              {field("Role (optional)", "role", person?.role ?? "", {
                maxLength: 500,
                placeholder: "e.g. PI, PhD student",
                list: "role-options",
              })}
            </div>
            <label className="field">
              <span>
                My plate is full at <small className="muted">(optional, percent of full time; the team level is {overloadLevel(plan)}%)</small>
              </span>
              <span className="pct-row">
                <span className="pct-input big">
                  <input
                    name="fullAt"
                    type="number"
                    min={10}
                    max={PERCENT_MAX}
                    step={5}
                    placeholder={String(overloadLevel(plan))}
                    defaultValue={person?.fullAt ?? ""}
                    aria-label="Full plate level in percent"
                  />
                  <span>%</span>
                </span>
                <small className="muted">For example 80 for part time, or 120 if you are fine with a busy period. Only an indication.</small>
              </span>
            </label>
            <div className="photo-field">
              <span className={`photo-preview${photoDraft ? "" : " empty"}`}>
                {photoDraft ? <img src={photoDraft} alt="" /> : <Camera size={20} />}
              </span>
              <div>
                <span className="photo-label">Photo (optional)</span>
                <div className="photo-actions">
                  <label className="btn small">
                    <Upload size={14} />
                    {photoBusy ? "Reading…" : photoDraft ? "Change photo" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        setPhotoBusy(true);
                        try {
                          setPhotoDraft(await photoFromFile(file));
                          setError("");
                        } catch (err) {
                          setError((err as Error).message);
                        } finally {
                          setPhotoBusy(false);
                        }
                      }}
                    />
                  </label>
                  {photoDraft && (
                    <button type="button" className="text-btn" onClick={() => setPhotoDraft(undefined)}>
                      Remove
                    </button>
                  )}
                </div>
                <small className="field-hint">Cropped to a square and made small (about 15 kB), then saved in the team file.</small>
              </div>
            </div>
            <datalist id="role-options">
              {[...new Set(["PI", "Researcher", "Postdoc", "PhD student", "Research engineer", "Technician", "Admin", ...plan.people.map((p) => p.role ?? "").filter(Boolean)])].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <div hidden={!tracksCapacity(plan)}>
            <div className="form-grid">
              {field(
                "Working hours / week",
                "working",
                person?.capacityHours ?? "",
                {
                  type: "number",
                  min: 0,
                  max: 168,
                  step: 0.5,
                  placeholder: "Unknown",
                },
              )}
              {field(
                "Reserved for other duties",
                "reserved",
                person?.reservedHours ?? 0,
                { type: "number", min: 0, max: 168, step: 0.5, required: true },
              )}
            </div>
            <p className="field-hint">
              Project capacity = working hours minus reserved hours.
            </p>
            </div>
            <label className="field">
              Notes
              <textarea
                name="notes"
                defaultValue={person?.notes ?? ""}
                placeholder="Role, working pattern or other useful context"
                maxLength={10000}
              />
            </label>
            {person && (
              <div className="editor-section">
                <div className="section-heading">
                  <h3>Project assignments</h3>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      open({ type: "assignment", personId: person.id })
                    }
                  >
                    <Plus size={14} />
                    Assign
                  </button>
                </div>
                {plan.assignments
                  .filter((a) => a.personId === person.id)
                  .map((a) => (
                    <button
                      type="button"
                      className="assignment-item"
                      key={a.id}
                      onClick={() =>
                        open({
                          type: "cell",
                          personId: person.id,
                          projectId: a.projectId,
                        })
                      }
                    >
                      <span>
                        {plan.projects.find((p) => p.id === a.projectId)?.name}
                        <small>
                          {a.status !== "finished" && !a.estimated
                            ? "Unestimated"
                            : a.status === "finished"
                              ? "Completed"
                              : "Weekly hours scheduled"}
                        </small>
                      </span>
                      <Badge status={a.status} />
                      <ChevronRight size={14} />
                    </button>
                  ))}
                {!plan.assignments.some((a) => a.personId === person.id) && (
                  <p className="muted">No projects assigned yet.</p>
                )}
              </div>
            )}
            {errorView}
          </div>
          {actions(person ? "Save person" : "Add person")}
        </form>
      </Modal>
    );
  if (modal.type === "projectView") {
    if (!project) return null;
    const self: ModalState = { type: "projectView", id: project.id, back: modal.back };
    return (
      <Modal
        title={isActivity(project) ? "Activity overview" : "Project overview"}
        eyebrow={isActivity(project) ? "ACTIVITIES" : "PROJECT PORTFOLIO"}
        onClose={onClose}
        wide
        className="dialog-pview"
      >
        <div className="dialog-body pdetail-body">
          <ProjectDetail
            plan={plan}
            project={project}
            week={props.week}
            open={(m) => open({ ...m, back: m.back ? self : undefined } as ModalState)}
            onAddTeam={() => patch((p) => void addWholeTeam(p, project.id), "Whole team added")}
            onRemove={(id) =>
              patch((p) => {
                p.assignments = p.assignments.filter((x) => x.id !== id);
                p.allocations = p.allocations.filter((x) => x.assignmentId !== id);
              }, "Removed from the project")
            }
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn primary" onClick={() => open({ type: "project", id: project.id, back: self })}>
            <Pencil size={15} />
            Edit
          </button>
        </div>
      </Modal>
    );
  }
  if (modal.type === "project")
    return (
      <Modal
        title={
          project
            ? isActivity(project)
              ? "Activity details"
              : "Project details"
            : kindSel === "project"
              ? "Create a project"
              : "Add an activity"
        }
        eyebrow={kindSel === "project" ? "PROJECT PORTFOLIO" : "ACTIVITIES"}
        onClose={onClose}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              const name = String(f.get("name")).trim();
              if (!name) throw new Error("Enter a project name.");
              if (
                plan.projects.some(
                  (p) =>
                    p.id !== project?.id &&
                    p.name.toLowerCase() === name.toLowerCase(),
                )
              )
                throw new Error("A project with this name already exists.");
              patch(
                (p) => {
                  const text = (k: string) => String(f.get(k) ?? "").trim();
                  const year = (k: string) => {
                    const v = text(k);
                    if (!v) return null;
                    const n = Number(v);
                    if (!Number.isInteger(n) || n < 1900 || n > 2200)
                      throw new Error("Years must be four-digit years.");
                    return n;
                  };
                  let startYear = year("startYear"),
                    endYear = year("endYear");
                  if (startYear != null && endYear != null && startYear > endYear)
                    throw new Error("The end year is before the start year.");
                  const stageId = String(f.get("status"));
                  const ownStage = stageDefs(p).find((d) => d.id === stageId && d.like);
                  const status = (ownStage?.like ?? stageId) as ProjectStatus;
                  const today = dateKey(new Date());
                  const dates: ProjectDates = {};
                  DATE_FIELDS.forEach(({ key }) => {
                    if (datesDraft[key]) dates[key] = datesDraft[key];
                  });
                  // Granted or started without a confirmed period: take the proposed one.
                  if ((status === "granted" || status === "ongoing") && !dates.start && !dates.end && dates.plannedStart && dates.plannedEnd) {
                    dates.start = dates.plannedStart;
                    dates.end = dates.plannedEnd;
                  }
                  const pair = (a?: string, b?: string, what = "period") => {
                    if (a && b && a > b) throw new Error(`The ${what} ends before it starts.`);
                  };
                  pair(dates.appStart, dates.appDue, "application");
                  pair(dates.plannedStart, dates.plannedEnd, "proposed period");
                  pair(dates.start, dates.end, "contract period");
                  const exts = extDraft.filter((x) => x.end).map((x) => {
                    const e: Extension = { id: x.id, end: x.end };
                    if (x.note?.trim()) e.note = x.note.trim();
                    if (x.approvedOn) e.approvedOn = x.approvedOn;
                    return e;
                  });
                  if (exts.length && !dates.end)
                    throw new Error("Add the contract end date before an extension.");
                  let prev = dates.end ?? "";
                  exts.forEach((x, i) => {
                    if (x.end <= prev)
                      throw new Error(`Extension ${i + 1} must end after ${i ? "the previous extension" : "the contract end"}.`);
                    prev = x.end;
                  });
                  const finalEnd = exts.length ? exts[exts.length - 1].end : dates.end;
                  // Closing early: record today as the finish date.
                  if (status === "finished" && project?.status !== "finished" && !dates.finishedOn && finalEnd && finalEnd > today)
                    dates.finishedOn = today;
                  const s0 = dates.start ?? dates.plannedStart,
                    e0 = dates.finishedOn ?? finalEnd ?? dates.plannedEnd;
                  if (s0) startYear = Number(s0.slice(0, 4));
                  if (e0) endYear = Number(e0.slice(0, 4));
                  // Change log for an existing project.
                  const log: DateChange[] = [...(project?.dateLog ?? [])];
                  const reason = text("dateReason");
                  const add = (field: string, from?: string, to?: string) => {
                    const c: DateChange = { on: today, field };
                    if (from) c.from = from;
                    if (to) c.to = to;
                    if (reason) c.note = reason;
                    log.push(c);
                  };
                  if (project) {
                    const old = project.dates ?? {};
                    DATE_FIELDS.forEach(({ key, label }) => {
                      if ((old[key] ?? "") !== (dates[key] ?? "")) add(label, old[key], dates[key]);
                    });
                    const oldExt = project.extensions ?? [];
                    for (let i = 0; i < Math.max(oldExt.length, exts.length); i++)
                      if ((oldExt[i]?.end ?? "") !== (exts[i]?.end ?? ""))
                        add(`Extension ${i + 1}`, oldExt[i]?.end, exts[i]?.end);
                    if (stageKey(project) !== stageId)
                      add("Status", stageName(stageKey(project)), stageName(stageId));
                  }
                  const record: Project = {
                    ...(project ?? {}),
                    id: project?.id ?? uid(),
                    kind: kindSel,
                    name,
                    status,
                    notes: String(f.get("notes")),
                    type: text("type") || undefined,
                    funder: text("funder") || undefined,
                    centre: text("centre") || undefined,
                    abbreviation: text("abbreviation") || undefined,
                    fullTitle: text("fullTitle") || undefined,
                    startYear,
                    endYear,
                    description: text("description") || undefined,
                  };
                  for (const k of ["type", "funder", "centre", "description", "abbreviation", "fullTitle"] as const)
                    if (!record[k]) delete record[k];
                  const pi = text("piId");
                  if (kindSel === "project" && pi && p.people.some((x) => x.id === pi)) record.piId = pi;
                  else if (kindSel === "project") delete record.piId;
                  if (kindSel !== "project") {
                    delete record.piId;
                    const fixed = ROLES_FOR[kindSel];
                    const roles: RoleEntry[] = [];
                    (fixed.length ? fixed : [text("role-name-0")]).forEach((role, i) => {
                      const typed = text(`role-person-${i}`);
                      if (!role || !typed) return;
                      const person = p.people.find((x) => x.name.trim().toLowerCase() === typed.toLowerCase());
                      roles.push(person ? { role, personId: person.id, name: person.name } : { role, name: typed });
                    });
                    if (!fixed.length && !text("role-name-0") && text("role-person-0"))
                      throw new Error("Give the role a name, for example Organiser, or clear the person.");
                    if (roles.length) record.roles = roles;
                    else delete record.roles;
                  } else delete record.roles;
                  if (ownStage) record.stage = ownStage.id;
                  else delete record.stage;
                  if (record.kind === "project") delete record.kind;
                  if (record.startYear == null) delete record.startYear;
                  if (record.endYear == null) delete record.endYear;
                  if (Object.keys(dates).length) record.dates = dates;
                  else delete record.dates;
                  if (kindSel !== "project" && schedDraft && MODES_FOR[kindSel].includes(schedDraft.mode)) {
                    record.schedule = schedDraft;
                    const b = scheduleBounds(schedDraft, periodsOf(p));
                    if (b.length && !Object.keys(dates).length) {
                      record.startYear = Number(b[0][0].slice(0, 4));
                      record.endYear = Number(b[b.length - 1][1].slice(0, 4));
                    }
                    if (project && JSON.stringify(project.schedule ?? null) !== JSON.stringify(schedDraft))
                      log.push({
                        on: today,
                        field: "Schedule",
                        ...(project.schedule ? { from: scheduleSummary(project.schedule, periodsOf(p)).slice(0, 80) } : {}),
                        to: scheduleSummary(schedDraft, periodsOf(p)).slice(0, 80),
                        ...(reason ? { note: reason } : {}),
                      });
                  } else delete record.schedule;
                  if (exts.length) record.extensions = exts;
                  else delete record.extensions;
                  const points = fromDrafts(msDraft);
                  // Milestones and deadlines that move with a new project end.
                  const shifted = new Set<string>();
                  for (const mv of endPlan().moves)
                    if (!shiftOff.includes(mv.id)) {
                      const m = points.find((x) => x.id === mv.id);
                      if (m) {
                        m.date = mv.to;
                        shifted.add(m.id);
                      }
                    }
                  points.sort((a, b) => a.date.localeCompare(b.date));
                  if (points.length) record.milestones = points;
                  else delete record.milestones;
                  // A moved milestone or deadline goes into the date history, like other dates.
                  if (project)
                    for (const m of points) {
                      const old = project.milestones?.find((x) => x.id === m.id);
                      carryMove(old, m, today);
                      if (old && old.date !== m.date)
                        log.push({
                          on: today,
                          field: `${milestoneKindLabels[m.kind]}: ${m.title}`.slice(0, 80),
                          from: old.date,
                          to: m.date,
                          ...(reason ? { note: reason } : shifted.has(m.id) ? { note: "Moved with the project end" } : {}),
                        });
                    }
                  if (libDraft.length !== taskLibrary(p).length) p.taskLibrary = libDraft;
                  const groups = groupsDraft.filter((id) => libDraft.some((t) => t.id === id));
                  if (groups.length) record.taskGroups = groups;
                  else delete record.taskGroups;
                  if (log.length) record.dateLog = log.slice(-1000);
                  else delete record.dateLog;
                  if (record.schedule) {
                    const sc = record.schedule;
                    if (sc.mode !== "periods" && !sc.start) throw new Error("Choose a date for this activity, or switch the date entry off.");
                    if (sc.from && sc.to && sc.to <= sc.from && (sc.mode !== "range" || (sc.end ?? sc.start) === sc.start))
                      throw new Error("The end time must be after the start time.");
                    if (sc.start && sc.end && sc.end < sc.start) throw new Error("The last day is before the first day.");
                  }
                  if (project)
                    p.projects = p.projects.map((x) =>
                      x.id === project.id ? record : x,
                    );
                  else {
                    p.projects.push(record);
                    if (f.get("wholeTeam")) addWholeTeam(p, record.id);
                  }
                },
                project ? "Project updated" : f.get("wholeTeam") ? "Created with the whole team" : "Project created",
              );
            });
          }}
        >
          <div className="dialog-body">
            <div className="kind-picker" role="radiogroup" aria-label="Kind">
              {kinds.map((k) => (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={kindSel === k}
                  className={`kind-chip k-${k} ${kindSel === k ? "on" : ""}`}
                  onClick={() => {
                    setKindSel(k);
                    setStageSel(project ? stageKey(project) : k === "project" ? "proposal" : "ongoing");
                  }}
                >
                  {kindLabels[k]}
                </button>
              ))}
            </div>
            {field(
              kindSel === "project" ? "Project name" : "Activity name",
              "name",
              project?.name ?? "",
              {
                required: true,
                maxLength: 500,
                placeholder:
                  kindSel === "teaching"
                    ? "e.g. MG2045 Surface metrology"
                    : kindSel === "supervision"
                      ? "e.g. PhD supervision, MSc theses"
                      : kindSel === "networking"
                        ? "e.g. Conferences and networking"
                        : undefined,
              },
            )}
            <div className="form-grid abbr-grid">
              {field("Abbreviation (optional)", "abbreviation", project?.abbreviation ?? "", {
                maxLength: PROJECT_ABBR_MAX,
                placeholder: "e.g. NOVA",
              })}
              {field("Full title (optional)", "fullTitle", project?.fullTitle ?? "", {
                maxLength: 1000,
                placeholder: "The official title, shown on the project page",
              })}
            </div>
            <p className="field-hint">The abbreviation is shown on cards and the timeline; the full title on the project page.</p>
            <label className="field">
              {kindSel === "project" ? "Project stage" : "Status"}
              <select
                name="status"
                key={kindSel}
                onChange={(e) => setStageSel(e.target.value)}
                defaultValue={
                  project ? stageKey(project) : kindSel === "project" ? "proposal" : "ongoing"
                }
              >
                {stageDefs(plan)
                  .filter((d) => !d.hidden || (project && stageKey(project) === d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
              </select>
            </label>
            <p className="field-hint">
              {kindSel === "project"
                ? "Project stage and individual assignment status are separate. Changing the stage preserves each person’s assignment."
                : tracksCapacity(plan)
                  ? "Activities are planned like projects: assign people and give them weekly hours. They count against capacity."
                  : "Activities are assigned to people like projects. Say when they happen below."}
            </p>
            {kindSel !== "project" && (
              <div className="role-fields" key={`roles-${kindSel}`}>
                {(ROLES_FOR[kindSel].length ? ROLES_FOR[kindSel] : [""]).map((role, i) => {
                  const own = kindOf(project) === kindSel ? project?.roles ?? [] : [];
                  const cur = role ? own.find((r) => r.role === role) : own[0];
                  const who = cur ? roleName(plan, cur) : "";
                  return role ? (
                    <label className="field" key={role}>
                      {role} (optional)
                      <input name={`role-person-${i}`} defaultValue={who} maxLength={ROLE_TEXT_MAX} list="people-options" placeholder="Pick from the team or type a name" />
                    </label>
                  ) : (
                    <div className="form-grid" key="free">
                      <label className="field">
                        Role (optional)
                        <input name="role-name-0" defaultValue={cur?.role ?? ""} maxLength={ROLE_TEXT_MAX} placeholder="e.g. Organiser, Contact person" />
                      </label>
                      <label className="field">
                        Person
                        <input name="role-person-0" defaultValue={who} maxLength={ROLE_TEXT_MAX} list="people-options" placeholder="Pick from the team or type a name" />
                      </label>
                    </div>
                  );
                })}
                <datalist id="people-options">
                  {[...plan.people]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((x) => (
                      <option key={x.id} value={x.name} />
                    ))}
                </datalist>
              </div>
            )}
            {kindSel === "project" && (
              <>
            <div className="form-grid">
              {field("Type (optional)", "type", project?.type ?? "", {
                maxLength: 500,
                placeholder: "e.g. Research",
                list: "type-options",
              })}
              {field("Funder (optional)", "funder", project?.funder ?? "", {
                maxLength: 500,
                placeholder: "e.g. Vinnova",
                list: "funder-options",
              })}
              {field("Research centre (optional)", "centre", project?.centre ?? "", {
                maxLength: 500,
                placeholder: "e.g. a competence centre",
                list: "centre-options",
              })}
            </div>
            <label className="field">
              Project PI (optional)
              <select name="piId" defaultValue={project?.piId && plan.people.some((x) => x.id === project.piId) ? project.piId : ""}>
                <option value="">Not set</option>
                {[...plan.people]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.role ? ` (${x.role})` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <datalist id="type-options">
              {typeOptions(plan).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <datalist id="centre-options">
              {centreOptions(plan).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <datalist id="funder-options">
              {funderOptions(plan).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
              </>
            )}
            {kindSel !== "project" && (
              <>
                <ScheduleEditor
                  kind={kindSel}
                  value={schedDraft}
                  onChange={setSchedDraft}
                  periods={periodsOf(plan)}
                  onOpenSettings={() => open({ type: "settings" })}
                />
                {schedDraft && (
                  <div className="row-actions">
                    <button type="button" className="text-btn" onClick={() => setSchedDraft(undefined)}>
                      <X size={14} />
                      Clear dates
                    </button>
                    {project && tracksCapacity(plan) && project.schedule && (
                      <button
                        type="button"
                        className="text-btn"
                        title="Writes the scheduled hours into each team member's weekly plan for the next 26 weeks"
                        onClick={() => {
                          const sc = project.schedule!;
                          const ps = periodsOf(plan);
                          let n = 0;
                          patch((p) => {
                            const start = monday();
                            p.assignments
                              .filter((a) => a.projectId === project.id && a.status !== "finished")
                              .forEach((a) => {
                                for (let i = 0, w = start; i < 26; i++, w = addWeeks(w, 1)) {
                                  const h = Math.round(scheduleWeekHours(sc, ps, w) * 10) / 10;
                                  if (h <= 0) continue;
                                  p.allocations = p.allocations.filter((x) => x.assignmentId !== a.id || x.week !== w);
                                  p.allocations.push({ id: uid(), assignmentId: a.id, week: w, hours: h, note: "From schedule" });
                                  a.estimated = true;
                                  n++;
                                }
                              });
                          }, "Weekly hours filled from the schedule");
                          if (!n) setError("No timed meetings in the next 26 weeks, so no hours were filled. Add a from and to time, or hours per week for teaching.");
                          else onClose();
                        }}
                      >
                        <CalendarRange size={14} />
                        Fill weekly hours from this schedule
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {kindSel === "project" && (
            <div className="dates-section">
              <h3>Dates</h3>
              {(() => {
                const dateInput = (k: keyof ProjectDates, l: string) => (
                  <label key={k}>
                    {l}
                    <input
                      type="date"
                      value={datesDraft[k] ?? ""}
                      onChange={(e) =>
                        setDatesDraft((d) => {
                          const n = { ...d };
                          if (e.target.value) n[k] = e.target.value;
                          else delete n[k];
                          return n;
                        })
                      }
                    />
                  </label>
                );
                const extBlock = (
                  <div className="dates-ext">
  {extDraft.length > 0 && (
                  <div className="ext-row ext-head">
                    <span />
                    <span>Extended to</span>
                    <span>Reason</span>
                    <span>Approved on</span>
                    <span />
                  </div>
                )}
                {extDraft.map((x, i) => (
                  <div className="ext-row" key={x.id}>
                    <span className="ext-n">+{i + 1}</span>
                    <input
                      type="date"
                      aria-label={`Extension ${i + 1} new end date`}
                      value={x.end}
                      onChange={(e) =>
                        setExtDraft((l) => l.map((y) => (y.id === x.id ? { ...y, end: e.target.value } : y)))
                      }
                    />
                    <input
                      aria-label={`Extension ${i + 1} note`}
                      placeholder="Why, e.g. Delayed equipment, no-cost extension"
                      maxLength={300}
                      value={x.note ?? ""}
                      onChange={(e) =>
                        setExtDraft((l) => l.map((y) => (y.id === x.id ? { ...y, note: e.target.value } : y)))
                      }
                    />
                    <input
                      type="date"
                      aria-label={`Extension ${i + 1} approved on`}
                      title="Approved on (optional)"
                      value={x.approvedOn ?? ""}
                      onChange={(e) =>
                        setExtDraft((l) =>
                          l.map((y) => (y.id === x.id ? { ...y, approvedOn: e.target.value || undefined } : y)),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove extension ${i + 1}`}
                      onClick={() => setExtDraft((l) => l.filter((y) => y.id !== x.id))}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {(() => {
                  const exts = extDraft.filter((x) => x.end);
                  const plan2 = endPlan();
                  const months = (a: string, b: string) => Math.round(daysBetween(a, b) / 30.44);
                  return (
                    <>
                      {datesDraft.end && exts.length > 0 && (
                        <div className="end-chain" aria-label="Project end after extensions">
                          <span>
                            Project end <b>{niceDay(datesDraft.end)}</b>
                          </span>
                          {exts.map((x, i) => (
                            <span key={x.id}>
                              → {i === exts.length - 1 ? "New project end" : `Extension ${i + 1}`} <b>{niceDay(x.end)}</b>
                              {x.end > (i ? exts[i - 1].end : datesDraft.end!) && (
                                <small className="muted"> (+{months(i ? exts[i - 1].end : datesDraft.end!, x.end)} mo)</small>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {plan2.moves.length > 0 && (
                        <div className="end-move">
                          <p>
                            <b>
                              The project end moves {plan2.delta > 0 ? "later" : "earlier"} by {Math.abs(plan2.delta)}{" "}
                              {Math.abs(plan2.delta) === 1 ? "day" : "days"}.
                            </b>{" "}
                            Move these milestones and deadlines with it? Untick any that keep their date.
                          </p>
                          {plan2.moves.map((mv) => {
                            const m = msDraft.find((x) => x.id === mv.id)!;
                            const on = !shiftOff.includes(mv.id);
                            return (
                              <label key={mv.id} className="check-row compact">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() =>
                                    setShiftOff((l) => (on ? [...l, mv.id] : l.filter((x) => x !== mv.id)))
                                  }
                                />
                                <span>
                                  {milestoneKindLabels[m.kind]}: <b>{m.title || "Untitled"}</b> {niceDay(mv.from)} →{" "}
                                  {on ? <b>{niceDay(mv.to)}</b> : <span className="muted">stays</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-btn"
                    disabled={!datesDraft.end}
                    title={datesDraft.end ? undefined : "Set the contract end date first"}
                    onClick={() => {
                      const last = extDraft.length ? extDraft[extDraft.length - 1].end : datesDraft.end!;
                      const d = parseDate(last);
                      d.setFullYear(d.getFullYear() + 1);
                      setExtDraft((l) => [...l, { id: `x-${uid().slice(0, 8)}`, end: dateKey(d) }]);
                    }}
                  >
                    <Plus size={14} />
                    Add extension
                  </button>
                  <small className="muted">
                    An extension keeps the original end date and shows on the same line.
                  </small>
                </div>
                  </div>
                );
                const groups: { id: DateGroup; label: string; keys: [keyof ProjectDates, string][] }[] = [
                  { id: "app", label: "Application", keys: [["appStart", "Start writing"], ["appDue", "Submission or deadline"]] },
                  { id: "decision", label: "Funding decision", keys: [["decisionOn", "Decision on"]] },
                  { id: "proposed", label: "Proposed period", keys: [["plannedStart", "From"], ["plannedEnd", "To"]] },
                  { id: "contract", label: "Contract period", keys: [["start", "Start"], ["end", "End"]] },
                  { id: "closing", label: "Closing", keys: [["finishedOn", "Finished on"]] },
                ];
                const like = (stageDefs(plan).find((d) => d.id === stageSel)?.like ?? stageSel) as ProjectStatus;
                const relevant = DATE_GROUPS_FOR[like] ?? groups.map((g) => g.id);
                const row = (g: (typeof groups)[number]) => (
                  <React.Fragment key={g.id}>
                    <div className="dates-grid">
                      <span className="lbl">{g.label}</span>
                      {g.keys.map(([k, l]) => dateInput(k, l))}
                    </div>
                    {g.id === "contract" && extBlock}
                  </React.Fragment>
                );
                const shown = groups.filter((g) => relevant.includes(g.id));
                const folded = groups.filter((g) => !relevant.includes(g.id));
                const filled = (g: (typeof groups)[number]) => {
                  const v = g.keys.map(([k]) => datesDraft[k]).filter(Boolean) as string[];
                  return v.length ? `${g.label} ${v.map(niceDay).join(" to ")}` : "";
                };
                const foldedText = folded.map(filled).filter(Boolean);
                const extFolded = folded.some((g) => g.id === "contract") && extDraft.some((x) => x.end);
                return (
                  <>
                    <p className="field-hint dates-hint">
                      Showing the dates for the {stageName(stageSel).toLowerCase()} stage. The other dates are kept and can be opened below.
                    </p>
                    {shown.map(row)}
                    {folded.length > 0 && (
                      <details className="dates-more">
                        <summary>
                          Other dates: {folded.map((g) => g.label).join(", ")}
                          {(foldedText.length > 0 || extFolded) && (
                            <small className="muted">
                              {" "}
                              ({[...foldedText, ...(extFolded ? [`${extDraft.filter((x) => x.end).length} extension(s)`] : [])].join(" · ")})
                            </small>
                          )}
                        </summary>
                        {folded.map(row)}
                      </details>
                    )}
                  </>
                );
              })()}
              {!Object.keys(datesDraft).length && (
                <div className="form-grid">
                  {field("Years only: from", "startYear", project?.startYear ?? "", {
                    type: "number",
                    min: 1900,
                    max: 2200,
                    step: 1,
                    placeholder: "2026",
                  })}
                  {field("to", "endYear", project?.endYear ?? "", {
                    type: "number",
                    min: 1900,
                    max: 2200,
                    step: 1,
                    placeholder: "2028",
                  })}
                </div>
              )}
              {Object.keys(datesDraft).length > 0 && (
                <>
                  <input type="hidden" name="startYear" value={project?.startYear ?? ""} />
                  <input type="hidden" name="endYear" value={project?.endYear ?? ""} />
                </>
              )}
              {project && (
                <label className="field">
                  Reason for date or status changes (optional, kept in the history)
                  <input name="dateReason" maxLength={300} placeholder="e.g. Funder approved six-month extension" />
                </label>
              )}
              {project?.dateLog?.length ? (
                <details>
                  <summary className="muted">History ({project.dateLog.length})</summary>
                  <ul className="date-log">
                    {[...project.dateLog].reverse().map((c, i) => (
                      <li key={i}>
                        <span className="when">{c.on}</span>
                        <b>{c.field}</b>: {c.from || "not set"} → {c.to || "removed"}
                        {c.note && <em> · {c.note}</em>}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            )}
            <div className="dates-section ms-section">
              <h3>
                Milestones and deadlines <small className="muted">(optional)</small>
              </h3>
              <MilestoneEditor value={msDraft} onChange={setMsDraft} />
            </div>
            {!project && plan.people.length > 0 && (
              <label className="check-row">
                <input type="checkbox" name="wholeTeam" defaultChecked={false} />
                <span>
                  Add the whole team ({plan.people.length} {plan.people.length === 1 ? "person" : "people"})
                  <small>Everyone gets this {kindSel === "project" ? "project" : "activity"} without hours; add tasks or remove people afterwards.</small>
                </span>
              </label>
            )}
            <div className="field">
              <span>
                Task groups <small className="muted">(optional; offered first when you assign people, each person adds detailed tasks)</small>
              </span>
              <GroupPicker
                library={libDraft}
                value={groupsDraft}
                onChange={setGroupsDraft}
                onAddTask={(name) => {
                  const t = newTaskType(name, libDraft);
                  setLibDraft((l) => [...l, t]);
                  return t;
                }}
              />
            </div>
            <label className="field">
              Short description (optional)
              <textarea
                name="description"
                defaultValue={project?.description ?? ""}
                placeholder="One or two sentences shown on the card"
                maxLength={2000}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                name="notes"
                defaultValue={project?.notes ?? ""}
                placeholder="Context or planning notes"
                maxLength={10000}
              />
            </label>
            {project && (
              <div className="editor-section">
                <div className="section-heading">
                  <h3>{isActivity(project) ? "Who takes part" : "Project team"}</h3>
                  <span className="section-actions">
                    {plan.people.some((x) => !plan.assignments.some((a) => a.projectId === project.id && a.personId === x.id)) && (
                      <button
                        className="text-btn"
                        type="button"
                        onClick={() =>
                          patch((p) => {
                            addWholeTeam(p, project.id);
                          }, "Whole team added")
                        }
                      >
                        <Users size={14} />
                        Add whole team
                      </button>
                    )}
                    <button
                      className="text-btn"
                      type="button"
                      onClick={() =>
                        open({ type: "assignment", projectId: project.id, back: modal.back })
                      }
                    >
                      <Plus size={14} />
                      Add person
                    </button>
                  </span>
                </div>
                {plan.assignments
                  .filter((a) => a.projectId === project.id)
                  .map((a) => {
                    const p = plan.people.find((x) => x.id === a.personId)!;
                    return (
                      <button
                        type="button"
                        className="assignment-item"
                        key={a.id}
                        onClick={() =>
                          open({
                            type: "cell",
                            personId: p.id,
                            projectId: project.id,
                          })
                        }
                      >
                        <Avatar
                          name={p.name}
                          index={plan.people.indexOf(p)}
                          small
                        />
                        <span>
                          {p.name}
                          <small>
                            {a.status !== "finished" && !a.estimated
                              ? "Unestimated"
                              : a.status === "finished"
                                ? "Completed"
                                : "Weekly hours scheduled"}
                          </small>
                        </span>
                        <Badge status={a.status} />
                      </button>
                    );
                  })}
                {!plan.assignments.some((a) => a.projectId === project.id) && (
                  <p className="muted">This project has no team members yet.</p>
                )}
              </div>
            )}
            {errorView}
          </div>
          {actions(
            project
              ? "Save"
              : kindSel === "project"
                ? "Create project"
                : "Add activity",
          )}
        </form>
      </Modal>
    );
  if (modal.type === "workitem") {
    const w = editItem;
    const all = workItemsOf(plan);
    const others = all.filter((x) => x.id !== w?.id);
    const uses = w ? workItemUses(plan, w.id) : [];
    const lib = taskLibrary(plan);
    return (
      <Modal title={w ? "Edit shared work" : "New shared work"} eyebrow="SHARED WORK" onClose={onClose} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              const name = String(f.get("name")).trim();
              const note = String(f.get("note")).trim();
              if (!name) throw new Error("Give the shared work a name.");
              if (others.some((x) => x.name.toLowerCase() === name.toLowerCase()))
                throw new Error("Another shared work item already has that name.");
              const rows = partsDraft.filter((r) => r.projectId);
              if (partsDraft.some((r) => !r.projectId)) throw new Error("Pick a project in every row, or remove the empty row.");
              if (rows.some((r) => r.personId && !r.taskId))
                throw new Error("Pick a task for each row with a person.");
              const refs = waitProj.filter((r) => r.projectId);
              patch((p) => {
                const list = workItemsOf(p).map((x) => ({ ...x }));
                const item: WorkItem = w
                  ? list.find((x) => x.id === w.id)!
                  : { id: `w-${uid().slice(0, 8)}`, name, status: wiStatus };
                item.name = name;
                item.status = wiStatus;
                if (note) item.note = note;
                else delete item.note;
                if (waitSel.length) item.waitsOn = waitSel;
                else delete item.waitsOn;
                if (refs.length)
                  item.waitsOnProjects = refs.map((r) => (r.taskId ? { projectId: r.projectId, taskId: r.taskId } : { projectId: r.projectId }));
                else delete item.waitsOnProjects;
                // Unlink every assignment task, then link what the rows say.
                p.assignments.forEach((a) =>
                  a.tasks?.forEach((t) => {
                    if (t.workItemId === item.id) delete t.workItemId;
                  }),
                );
                const links: { projectId: string; taskId?: string }[] = [];
                rows.forEach((r) => {
                  if (!r.personId) {
                    links.push(r.taskId ? { projectId: r.projectId, taskId: r.taskId } : { projectId: r.projectId });
                    return;
                  }
                  let a = p.assignments.find((x) => x.personId === r.personId && x.projectId === r.projectId);
                  if (!a) {
                    a = { id: uid(), personId: r.personId, projectId: r.projectId, status: "planned", estimated: false, notes: "" };
                    p.assignments.push(a);
                  }
                  a.tasks = a.tasks ?? [];
                  const t = a.tasks.find((x) => x.taskId === r.taskId);
                  if (t) t.workItemId = item.id;
                  else a.tasks.push({ taskId: r.taskId, workItemId: item.id });
                });
                if (links.length) item.links = links;
                else delete item.links;
                if (!w) list.push(item);
                p.workItems = list;
              }, w ? "Shared work updated" : "Shared work added");
            });
          }}
        >
          <div className="dialog-body">
            {field("Name", "name", w?.name ?? "", {
              required: true,
              maxLength: 120,
              placeholder: "e.g. Test piece batch A",
              autoFocus: !w,
            })}
            <div className="field">
              <span>Status</span>
              <div className="status-opts">
                {workStatuses.map((st) => (
                  <button
                    type="button"
                    key={st}
                    className={`ws-pill pick ws-${st} ${wiStatus === st ? "on" : ""}`}
                    aria-pressed={wiStatus === st}
                    onClick={() => setWiStatus(st)}
                  >
                    <i />
                    {workStatusLabels[st]}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              Note (optional)
              <input
                name="note"
                defaultValue={w?.note ?? ""}
                maxLength={1000}
                placeholder="e.g. 12 Ti-6Al-4V coupons, two surface finishes"
              />
            </label>
            <div className="field">
              <span>
                Waits on other shared work <small className="muted">(must be done first)</small>
              </span>
              {others.length ? (
                <div className="task-options">
                  {others.map((x) => {
                    const on = waitSel.includes(x.id);
                    const loop = !on && !!w && wouldLoop(
                      all.map((y) => (y.id === w.id ? { ...y, waitsOn: waitSel } : y)),
                      w.id,
                      x.id,
                    );
                    return (
                      <button
                        type="button"
                        key={x.id}
                        disabled={loop}
                        title={loop ? `${x.name} already waits on this` : undefined}
                        className={`task-chip pick t-amber ${on ? "on" : ""}`}
                        aria-pressed={on}
                        onClick={() =>
                          setWaitSel(on ? waitSel.filter((id) => id !== x.id) : [...waitSel, x.id])
                        }
                      >
                        {x.name}
                        {x.status === "done" && <em> done</em>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <small className="muted">Add more shared work to link it here.</small>
              )}
            </div>
            <div className="field">
              <span>
                Projects and tasks taking part{" "}
                <small className="muted">(each project with its own task; person optional)</small>
              </span>
              <div className="part-rows">
                {partsDraft.map((r) => {
                  const team = plan.assignments.filter((a) => a.projectId === r.projectId).map((a) => a.personId);
                  const set = (patch: Partial<PartRow>) =>
                    setPartsDraft((l) => l.map((x) => (x.key === r.key ? { ...x, ...patch } : x)));
                  return (
                    <div className="part-row" key={r.key}>
                      <select
                        aria-label="Project"
                        value={r.projectId}
                        onChange={(e) => set({ projectId: e.target.value })}
                      >
                        <option value="">Project…</option>
                        {plan.projects.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                      <select aria-label="Task" value={r.taskId} onChange={(e) => set({ taskId: e.target.value })}>
                        <option value="">Any task</option>
                        {lib.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <select aria-label="Person" value={r.personId} onChange={(e) => set({ personId: e.target.value })}>
                        <option value="">No one yet</option>
                        {plan.people
                          .filter((x) => team.includes(x.id))
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        {r.projectId && (
                          <optgroup label="Adds them to the project">
                            {plan.people
                              .filter((x) => !team.includes(x.id))
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Remove row"
                        onClick={() => setPartsDraft((l) => l.filter((x) => x.key !== r.key))}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      setPartsDraft((l) => [...l, { key: `n${uid().slice(0, 6)}`, projectId: "", taskId: "", personId: "" }])
                    }
                  >
                    <Plus size={14} />
                    Add project and task
                  </button>
                </div>
              </div>
            </div>
            <div className="field">
              <span>
                Also waits on a project or task{" "}
                <small className="muted">(done when the project finishes or everyone on that task has finished)</small>
              </span>
              <div className="part-rows">
                {waitProj.map((r, i) => (
                  <div className="part-row two" key={i}>
                    <select
                      aria-label="Waits on project"
                      value={r.projectId}
                      onChange={(e) =>
                        setWaitProj((l) => l.map((x, j) => (j === i ? { ...x, projectId: e.target.value } : x)))
                      }
                    >
                      <option value="">Project…</option>
                      {plan.projects.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Waits on task"
                      value={r.taskId ?? ""}
                      onChange={(e) =>
                        setWaitProj((l) =>
                          l.map((x, j) => (j === i ? { projectId: x.projectId, ...(e.target.value ? { taskId: e.target.value } : {}) } : x)),
                        )
                      }
                    >
                      <option value="">The whole project</option>
                      {lib.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove"
                      onClick={() => setWaitProj((l) => l.filter((_, j) => j !== i))}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setWaitProj((l) => [...l, { projectId: "" }])}
                  >
                    <Plus size={14} />
                    Add project or task to wait on
                  </button>
                </div>
              </div>
            </div>
            {w && (
              <div className="assignment-controls">
                <button
                  type="button"
                  className="text-btn danger-text"
                  onClick={() => {
                    patch((p) => {
                      p.workItems = workItemsOf(p)
                        .filter((x) => x.id !== w.id)
                        .map((x) =>
                          x.waitsOn?.includes(w.id)
                            ? (() => {
                                const rest = x.waitsOn!.filter((id) => id !== w.id);
                                const { waitsOn: _, ...y } = x;
                                return rest.length ? { ...y, waitsOn: rest } : y;
                              })()
                            : x,
                        );
                      if (!p.workItems.length) delete p.workItems;
                      p.assignments.forEach((a) =>
                        a.tasks?.forEach((t) => {
                          if (t.workItemId === w.id) delete t.workItemId;
                        }),
                      );
                    }, "Shared work removed; the tasks stay");
                    onClose();
                  }}
                >
                  <Trash2 size={15} />
                  Remove shared work
                </button>
              </div>
            )}
            {errorView}
          </div>
          {actions(w ? "Save" : "Add shared work")}
        </form>
      </Modal>
    );
  }
  if (modal.type === "assignment" || modal.type === "cell") {
    // An assignment that already exists is edited, whichever way the dialog was opened.
    const existing =
      modal.personId && modal.projectId
        ? plan.assignments.find(
            (a) =>
              a.personId === modal.personId && a.projectId === modal.projectId,
          )
        : undefined;
    return (
      <Modal
        title={existing ? "Edit engagement" : "Add an assignment"}
        eyebrow="PEOPLE & PROJECTS"
        onClose={onClose}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              const personId = modal.personId ?? String(f.get("person")),
                projectId = modal.projectId ?? String(f.get("project")),
                status = String(f.get("status")) as Status;
              const pctRaw = String(f.get("percent") ?? "").trim();
              const percent = pctRaw === "" ? undefined : Math.round(Number(pctRaw));
              if (percent !== undefined && !(Number.isFinite(percent) && percent >= 0 && percent <= PERCENT_MAX))
                throw new Error(`Involvement must be between 0 and ${PERCENT_MAX}%.`);
              if (!personId || !projectId)
                throw new Error("Choose a person and a project.");
              const conns = connDraft.filter((c) => c.taskId || c.projectId);
              if (conns.some((c) => !c.taskId || !c.projectId))
                throw new Error("Pick this assignment's task and the other project in each connection, or remove the row.");
              if (conns.some((c) => !selTasks.some((t) => t.taskId === c.taskId)))
                throw new Error("A connection uses a task that is no longer selected.");
              const tasks: AssignmentTask[] = selTasks
                .filter((t) => libDraft.some((x) => x.id === t.taskId))
                .map((t) => ({
                  taskId: t.taskId,
                  ...(t.note && t.note.trim() ? { note: t.note.trim() } : {}),
                  ...(t.workItemId ? { workItemId: t.workItemId } : {}),
                  ...(typeof t.percent === "number" ? { percent: t.percent } : {}),
                  ...(() => {
                    const items = (t.items ?? [])
                      .map((i) => ({ id: i.id, text: i.text.trim(), ...(i.done ? { done: true } : {}) }))
                      .filter((i) => i.text);
                    return items.length ? { items } : {};
                  })(),
                }));
              // Adding someone who is already on the project: show what changes, save only after a second click.
              const dup = existing
                ? undefined
                : plan.assignments.find((a) => a.personId === personId && a.projectId === projectId);
              if (dup) {
                const lines = assignmentDiff({ ...plan, taskLibrary: libDraft, workItems: wiDraft }, dup, {
                  status,
                  notes: String(f.get("notes")),
                  tasks,
                  percent,
                });
                const same = !!dupConfirm && dupConfirm.id === dup.id && JSON.stringify(dupConfirm.lines) === JSON.stringify(lines);
                if (same && !lines.length) {
                  onClose();
                  return;
                }
                if (!same) {
                  setDupConfirm({ id: dup.id, lines });
                  setTimeout(() => document.querySelector(".dup-diff")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
                  return false;
                }
              }
              const target = existing ?? dup;
              const asgId = target?.id ?? uid();
              patch(
                (p) => {
                  const lib = taskLibrary(p);
                  if (libDraft.length !== lib.length) p.taskLibrary = libDraft;
                  // A new group picked here joins the project's own list when it has one.
                  const pr = p.projects.find((x) => x.id === projectId);
                  if (pr?.taskGroups?.length) {
                    const add = tasks.map((t) => t.taskId).filter((id) => !pr.taskGroups!.includes(id));
                    if (add.length) pr.taskGroups = [...pr.taskGroups, ...add];
                  }
                  // Keep new shared work items only when a task links to them.
                  const known = new Set(workItemsOf(p).map((w) => w.id));
                  const added = wiDraft.filter(
                    (w) => !known.has(w.id) && tasks.some((t) => t.workItemId === w.id),
                  );
                  if (added.length) p.workItems = [...workItemsOf(p), ...added];
                  if (target) {
                    const a = p.assignments.find((x) => x.id === target.id)!;
                    a.status = status;
                    a.notes = String(f.get("notes"));
                    if (tasks.length) a.tasks = tasks;
                    else delete a.tasks;
                    if (percent !== undefined) a.percent = percent;
                    else delete a.percent;
                    if (status !== "finished")
                      a.estimated = p.allocations.some(
                        (x) => x.assignmentId === a.id,
                      );
                  } else
                    p.assignments.push({
                      id: asgId,
                      personId,
                      projectId,
                      status,
                      estimated: status === "finished",
                      notes: String(f.get("notes")),
                      ...(tasks.length ? { tasks } : {}),
                      ...(percent !== undefined ? { percent } : {}),
                    });
                  if (conns.length)
                    applyConnections(
                      p,
                      asgId,
                      conns.map((c) => ({
                        taskId: c.taskId,
                        kind: c.kind,
                        projectId: c.projectId,
                        ...(c.otherTaskId ? { otherTaskId: c.otherTaskId } : {}),
                      })),
                    );
                },
                conns.length
                  ? `${target ? "Assignment updated" : "Assignment added"}, ${conns.length} ${conns.length === 1 ? "connection" : "connections"} saved`
                  : target ? "Assignment updated" : "Assignment added",
              );
            });
          }}
        >
          <div className="dialog-body">
            <label className="field">
              Team member
              <select
                name="person"
                defaultValue={modal.personId ?? ""}
                disabled={!!modal.personId}
                required
                onChange={(e) => {
                  setAsgPerson(e.target.value);
                  setDupConfirm(null);
                }}
              >
                <option value="" disabled>
                  Select a person
                </option>
                {plan.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Project
              <select
                name="project"
                defaultValue={modal.projectId ?? ""}
                disabled={!!modal.projectId}
                required
                onChange={(e) => {
                  setAsgProject(e.target.value);
                  setDupConfirm(null);
                }}
              >
                <option value="" disabled>
                  Select a project
                </option>
                {plan.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const pid = modal.projectId ?? asgProject,
                who = modal.personId ?? asgPerson;
              const dup = !existing && pid && who ? plan.assignments.find((a) => a.personId === who && a.projectId === pid) : undefined;
              if (!dup || dupConfirm) return null;
              const name = plan.people.find((x) => x.id === who)?.name ?? "This person";
              return (
                <p className="dup-hint">
                  {name} is already on {plan.projects.find((x) => x.id === pid)?.name}. Saving shows what would change and lets you
                  update the current assignment.{" "}
                  <button type="button" className="text-btn" onClick={() => open({ type: "cell", personId: who, projectId: pid, back: modal.back })}>
                    Edit the current one instead
                  </button>
                </p>
              );
            })()}
            <label className="field">
              Assignment status
              <select
                name="status"
                defaultValue={existing?.status ?? "planned"}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            {(() => {
              const sum = taskPercent({ tasks: selTasks } as Assignment);
              const who = plan.people.find((x) => x.id === (modal.personId ?? asgPerson));
              const now = who ? personInvolvement(plan, who.id) : undefined;
              const self = existing ?? existingAssignment;
              const others = now ? now.total - (self && self.status === "ongoing" ? involvement(self) ?? 0 : 0) : 0;
              return (
                <div className="field pct-field">
                  <span>
                    Involvement in this project <small className="muted">(optional, percent of full time; an indication, not a timesheet)</small>
                  </span>
                  <div className="pct-row">
                    <label className="pct-input big">
                      <input
                        name="percent"
                        type="number"
                        min={0}
                        max={PERCENT_MAX}
                        step={5}
                        inputMode="decimal"
                        placeholder={sum !== undefined ? String(sum) : "e.g. 30"}
                        defaultValue={self?.percent ?? ""}
                        aria-label="Involvement in percent"
                      />
                      <span>%</span>
                    </label>
                    <small className="muted">
                      {sum !== undefined ? `Tasks below add up to ${sum}%. Leave empty to use that. ` : "Give tasks a percentage to show what makes up this share. "}
                      {who && now ? `${who.name.split(" ")[0]} is at ${Math.round(others)}% on other ongoing work.` : ""}
                    </small>
                  </div>
                </div>
              );
            })()}
            <div className="field">
              <span>
                Task groups <small className="muted">(click to add; a note and a numbered list of detailed tasks are optional)</small>
              </span>
              <TaskPicker
                library={libDraft}
                groups={plan.projects.find((x) => x.id === (modal.projectId ?? asgProject))?.taskGroups}
                value={selTasks}
                onChange={setSelTasks}
                onAddTask={(name) => {
                  const t = newTaskType(name, libDraft);
                  setLibDraft((l) => [...l, t]);
                  return t;
                }}
                items={wiDraft}
                onAddItem={(name) => {
                  const w: WorkItem = { id: `w-${uid().slice(0, 8)}`, name, status: "active" };
                  setWiDraft((l) => [...l, w]);
                  return w;
                }}
                hint={(id) => {
                  const self = existing ?? existingAssignment;
                  const others = workItemUses(plan, id).filter(
                    (u) => !self || u.assignment.id !== self.id,
                  );
                  if (!others.length) return wiDraft.some((w) => w.id === id) && !workItemsOf(plan).some((w) => w.id === id) ? "New shared work item" : "";
                  return (
                    "Also: " +
                    others
                      .slice(0, 3)
                      .map((u) => {
                        const pr = plan.projects.find((x) => x.id === u.assignment.projectId)?.name;
                        const who = plan.people.find((x) => x.id === u.assignment.personId)?.name ?? "";
                        const t = libDraft.find((x) => x.id === u.task.taskId)?.name;
                        return `${t} in ${pr} (${who.split(" ")[0]})`;
                      })
                      .join(", ") +
                    (others.length > 3 ? ` and ${others.length - 3} more` : "")
                  );
                }}
              />
            </div>
            <ConnectionsSection
              plan={plan}
              library={libDraft}
              projectId={modal.projectId ?? asgProject}
              tasks={selTasks}
              rows={connDraft}
              setRows={setConnDraft}
            />
            <label className="field">
              Description (optional)
              <textarea
                name="notes"
                defaultValue={existing?.notes ?? ""}
                placeholder="What this person does here, e.g. WP2 lead, lab tests, course examiner"
                maxLength={10000}
              />
            </label>
            {existing && (
              <div className="assignment-controls">
                {existing.status !== "finished" && tracksCapacity(plan) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      open({
                        type: "allocation",
                        personId: existing.personId,
                        projectId: existing.projectId,
                      })
                    }
                  >
                    <CalendarRange size={16} />
                    Plan weekly hours
                  </button>
                )}
                <button
                  type="button"
                  className="text-btn danger-text"
                  onClick={() => {
                    patch((p) => {
                      p.assignments = p.assignments.filter(
                        (a) => a.id !== existing.id,
                      );
                      p.allocations = p.allocations.filter(
                        (a) => a.assignmentId !== existing.id,
                      );
                    }, "Assignment and its scheduled hours removed");
                    onClose();
                  }}
                >
                  <Trash2 size={15} />
                  Remove assignment
                </button>
              </div>
            )}
            {dupConfirm && (
              <div className="dup-diff" role="alert">
                <h3>
                  {plan.people.find((x) => x.id === (modal.personId ?? asgPerson))?.name ?? "This person"} is already on{" "}
                  {plan.projects.find((x) => x.id === (modal.projectId ?? asgProject))?.name}
                </h3>
                {dupConfirm.lines.length ? (
                  <>
                    <p>Updating replaces the current assignment. This is what changes:</p>
                    <ul>
                      {dupConfirm.lines.map((l, i) => (
                        <li key={i} className={`d-${l.kind}`}>
                          <span aria-hidden="true">{l.kind === "add" ? "+" : l.kind === "remove" ? "\u2212" : "~"}</span>
                          <span className="sr-only">{l.kind === "add" ? "Added: " : l.kind === "remove" ? "Removed: " : "Changed: "}</span>
                          {l.text}
                        </li>
                      ))}
                    </ul>
                    <p className="muted">Planned hours are kept. Undo is available after saving.</p>
                  </>
                ) : (
                  <p>Nothing would change: the current assignment already matches.</p>
                )}
                <div className="row-actions">
                  <button type="button" className="text-btn" onClick={() => setDupConfirm(null)}>
                    Keep editing
                  </button>
                  <button type="button" className="text-btn" onClick={onClose}>
                    Keep the current assignment
                  </button>
                </div>
              </div>
            )}
            {errorView}
          </div>
          {actions(existing ? "Save assignment" : dupConfirm ? (dupConfirm.lines.length ? "Update assignment" : "Close") : "Add assignment")}
        </form>
      </Modal>
    );
  }
  if (modal.type === "allocation") {
    const assignment = plan.assignments.find(
      (a) => a.personId === selectedPerson && a.projectId === selectedProject,
    );
    const capacity = capacityFor(plan, selectedPerson, start);
    const personName =
      plan.people.find((p) => p.id === selectedPerson)?.name ??
      "This person";
    const noCapacity = capacity == null || capacity === 0;
    const pctCapacity =
      capacity && capacity > 0
        ? capacity
        : newCapacity !== "" && Number(newCapacity) > 0
          ? Number(newCapacity)
          : null;
    const pctPreview =
      unit === "percent" && hours !== "" && pctCapacity != null
        ? Math.round(pctCapacity * Number(hours)) / 100
        : null;
    const startHours = plan.allocations.find(
      (a) => a.assignmentId === assignment?.id && a.week === start,
    )?.hours;
    return (
      <Modal
        title="Plan weekly hours"
        eyebrow="CAPACITY PLANNER"
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              if (!selectedPerson || !selectedProject)
                throw new Error("Choose a person and a project.");
              if (assignment?.status === "finished")
                throw new Error(
                  "Change the finished assignment to ongoing or planned before adding hours.",
                );
              let next = clone(plan);
              let a = next.assignments.find(
                (a) =>
                  a.personId === selectedPerson &&
                  a.projectId === selectedProject,
              );
              if (!a) {
                a = {
                  id: uid(),
                  personId: selectedPerson,
                  projectId: selectedProject,
                  status: String(f.get("status")) as Status,
                  estimated: false,
                  notes: "",
                };
                next.assignments.push(a);
              }
              if (hours === "")
                throw new Error(
                  "Enter weekly hours or an allocation percentage.",
                );
              const number = Number(hours);
              if (!Number.isFinite(number) || number < 0)
                throw new Error("Enter a valid allocation.");
              if (unit === "percent" && newCapacity !== "") {
                const c = Number(newCapacity);
                if (!Number.isFinite(c) || c <= 0 || c > 168)
                  throw new Error(
                    "Enter project hours per week between 0 and 168.",
                  );
                const pp = next.people.find((x) => x.id === selectedPerson);
                if (pp && pp.capacityHours == null)
                  pp.capacityHours = c + (pp.reservedHours || 0);
              }
              const weekNote = String(f.get("weekNote") ?? "");
              if (unit === "hours")
                next = setAllocation(
                  next,
                  a.id,
                  monday(start),
                  monday(end),
                  number,
                  weekNote,
                );
              else {
                if (number > 1000)
                  throw new Error("Enter a percentage of 1000% or less.");
                if (start > end)
                  throw new Error(
                    "The end week must be on or after the start week.",
                  );
                if (
                  new Date(end).getTime() - new Date(start).getTime() >
                  366 * 5 * 86400000
                )
                  throw new Error("Plan up to five years at a time.");
                for (
                  let w = monday(start);
                  w <= monday(end);
                  w = addWeeks(w, 1)
                ) {
                  const cap = capacityFor(next, selectedPerson, w);
                  if (cap == null || cap === 0)
                    throw new Error(
                      `${personName} has no capacity for the week of ${weekLabel(w)}. Enter their project hours per week above, or plan in hours.`,
                    );
                  next = setAllocation(
                    next,
                    a.id,
                    w,
                    w,
                    Math.round(cap * number) / 100,
                    weekNote,
                  );
                }
              }
              change(next, "Weekly allocation saved");
            });
          }}
        >
          <div className="dialog-body">
            <label className="field">
              Team member
              <select
                required
                value={selectedPerson}
                onChange={(e) => {
                  setSelectedPerson(e.target.value);
                  setHours("");
                  setNewCapacity("");
                }}
              >
                {plan.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Project
              <select
                required
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setHours("");
                }}
              >
                <option value="" disabled>
                  Select a project
                </option>
                {plan.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {!assignment && (
              <label className="field">
                New assignment status
                <select name="status" defaultValue="planned">
                  <option value="planned">Planned / tentative</option>
                  <option value="ongoing">Ongoing / committed</option>
                </select>
              </label>
            )}
            {assignment && (
              <div className="inline-context">
                <Badge status={assignment.status} />
                <span>
                  {startHours != null
                    ? `${fmt(startHours)}h already scheduled for the start week`
                    : "No hours scheduled for the start week"}
                </span>
              </div>
            )}
            <div className="form-grid">
              <label className="field">
                From week
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => {
                    if (e.target.value) {
                      const w = monday(e.target.value);
                      setStart(w);
                      if (w > end) setEnd(w);
                    }
                  }}
                />
              </label>
              <label className="field">
                Through week
                <input
                  type="date"
                  required
                  value={end}
                  min={start}
                  onChange={(e) => {
                    if (e.target.value) setEnd(monday(e.target.value));
                  }}
                />
              </label>
            </div>
            <div className="allocation-input">
              <label className="field">
                Allocation per week
                <input
                  type="number"
                  required
                  min="0"
                  max={unit === "hours" ? 168 : 1000}
                  step="0.1"
                  placeholder="Enter amount"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
              <label className="field">
                Unit
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setHours("");
                  }}
                >
                  <option value="hours">Hours / week</option>
                  <option value="percent">% of project capacity</option>
                </select>
              </label>
            </div>
            {unit === "percent" && noCapacity && (
              <div className="capacity-inline">
                <label className="field">
                  {personName}’s project hours per week
                  <input
                    type="number"
                    min="0.5"
                    max="168"
                    step="0.5"
                    required
                    placeholder="e.g. 32"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </label>
                <p className="field-hint">
                  Percent needs a capacity to convert to hours. This is saved
                  as {personName.split(" ")[0]}’s weekly capacity and can be
                  changed later in Default weekly hours.
                </p>
              </div>
            )}
            <label className="field">
              Description (optional)
              <input
                name="weekNote"
                maxLength={500}
                placeholder="What the hours are for, e.g. lab campaign, exam marking"
              />
            </label>
            {pctPreview != null && (
              <p className="field-hint pct-preview">
                {fmt(Number(hours))}% of {fmt(pctCapacity!)} h ={" "}
                <strong>{fmt(pctPreview)} h per week</strong>
              </p>
            )}
            <div className="info-note">
              <Info size={17} />
              <p>
                {capacity == null
                  ? "This person’s capacity is not set yet. Hours can be planned now; percent needs a weekly capacity."
                  : `Project capacity for the start week: ${fmt(capacity)}h.`}{" "}
                Existing allocations in the selected weeks will be replaced.
                Other weeks stay unchanged.
              </p>
            </div>
            {errorView}
          </div>
          {actions("Save allocation")}
        </form>
      </Modal>
    );
  }
  if (modal.type === "capacity" && person) {
    const w = modal.week!;
    const active = plan.assignments.filter(
      (a) => a.personId === person.id && a.status !== "finished",
    );
    const override = plan.capacityOverrides.find(
      (o) => o.personId === person.id && o.week === w,
    );
    const baseline =
      person.capacityHours == null
        ? null
        : person.capacityHours - person.reservedHours;
    const load = personLoad(plan, person.id, w);
    return (
      <Modal
        title={person.name}
        eyebrow={`WEEK OF ${weekLabel(w, true).toUpperCase()}`}
        onClose={onClose}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => {
              const next = clone(plan);
              next.capacityOverrides = next.capacityOverrides.filter(
                (o) => o.personId !== person.id || o.week !== w,
              );
              const raw = String(f.get("capacity"));
              if (raw !== "") {
                const value = Number(raw);
                if (!Number.isFinite(value) || value < 0 || value > 168)
                  throw new Error("Enter capacity between 0 and 168 hours.");
                const reason = String(f.get("capacityNote") ?? "").trim();
                next.capacityOverrides.push(
                  reason
                    ? { personId: person.id, week: w, hours: value, note: reason }
                    : { personId: person.id, week: w, hours: value },
                );
              }
              for (const a of active) {
                const amount = String(f.get(a.id));
                next.allocations = next.allocations.filter(
                  (x) => x.assignmentId !== a.id || x.week !== w,
                );
                if (amount !== "") {
                  const hours = Number(amount);
                  if (!Number.isFinite(hours) || hours < 0 || hours > 168)
                    throw new Error(
                      "Enter allocation hours between 0 and 168.",
                    );
                  const note = String(f.get(`note-${a.id}`) ?? "").trim();
                  next.allocations.push(
                    note
                      ? { id: uid(), assignmentId: a.id, week: w, hours, note }
                      : { id: uid(), assignmentId: a.id, week: w, hours },
                  );
                }
                next.assignments.find((x) => x.id === a.id)!.estimated =
                  next.allocations.some((x) => x.assignmentId === a.id);
              }
              change(next, "Week updated");
            });
          }}
        >
          <div className="dialog-body">
            <div className="week-load-summary">
              <span>
                <strong>{fmt(load.committed)}h</strong>Committed
              </span>
              <span>
                <strong>{fmt(load.tentative)}h</strong>Tentative
              </span>
              <span>
                <strong>
                  {load.capacity == null ? "—" : `${fmt(load.capacity)}h`}
                </strong>
                Capacity
              </span>
            </div>
            {field(
              "Project hours available this week",
              "capacity",
              override?.hours ?? "",
              {
                type: "number",
                min: 0,
                max: 168,
                step: 0.5,
                placeholder:
                  baseline == null ? "Unknown" : `${fmt(baseline)}h baseline`,
              },
            )}
            <p className="field-hint">
              {baseline == null
                ? "No default capacity set. Leave blank to keep it unknown, or set the default in Default weekly hours."
                : `Leave blank to use the default of ${fmt(baseline)} h. Set 0 for a week off.`}
            </p>
            {field("Reason (optional)", "capacityNote", override?.note ?? "", {
              maxLength: 500,
              placeholder: "e.g. Conference in Lyon, parental leave, course week",
            })}
            {override && (
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  patch((p) => {
                    p.capacityOverrides = p.capacityOverrides.filter(
                      (o) => o.personId !== person.id || o.week !== w,
                    );
                  }, "Week reset to default capacity");
                  onClose();
                }}
              >
                <RotateCcw size={14} />
                Reset to default{baseline == null ? "" : ` (${fmt(baseline)} h)`}
              </button>
            )}
            <div className="editor-section">
              <h3>Hours by project</h3>
              <p className="field-hint">
                A blank cell means no allocation in this week. Zero is an
                explicit estimate.
              </p>
              {active.map((a) => (
                <label className="weekly-assignment" key={a.id}>
                  <span>
                    {plan.projects.find((p) => p.id === a.projectId)?.name}
                    <small>
                      <i className={`dot ${a.status}`} />
                      {a.status === "ongoing" ? "Committed" : "Tentative"}
                      {!a.estimated ? " · Unestimated" : ""}
                    </small>
                  </span>
                  <input
                    aria-label={`Hours for ${plan.projects.find((p) => p.id === a.projectId)?.name}`}
                    name={a.id}
                    type="number"
                    min="0"
                    max="168"
                    step="0.1"
                    defaultValue={
                      plan.allocations.find(
                        (x) => x.assignmentId === a.id && x.week === w,
                      )?.hours ?? ""
                    }
                    placeholder="—"
                  />
                  <span className="hours-suffix">h</span>
                  <input
                    className="week-note"
                    aria-label={`Note for ${plan.projects.find((p) => p.id === a.projectId)?.name}`}
                    name={`note-${a.id}`}
                    maxLength={500}
                    defaultValue={
                      plan.allocations.find(
                        (x) => x.assignmentId === a.id && x.week === w,
                      )?.note ?? ""
                    }
                    placeholder="Note (optional)"
                  />
                </label>
              ))}
              {!active.length && (
                <p className="muted">
                  No active assignments. Add a project assignment first.
                </p>
              )}
            </div>
            {errorView}
          </div>
          {actions("Save week")}
        </form>
      </Modal>
    );
  }
  return null;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol.startsWith("http")
)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });

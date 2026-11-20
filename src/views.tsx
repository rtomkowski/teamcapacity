// Team and Projects views in the card style (v3).
import { teamTakeaway, loadTakeaway, projectsTakeaway, assignmentsTakeaway, tasksTakeaway, estimatesTakeaway, involvementTakeaway, largestTakeaway, homeInsights, homeHeadline, type Insight } from "./insights.ts";
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  CalendarDays,
  Users,
  ArrowUpRight,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Link2,
  Hourglass,
  GanttChart,
  CalendarClock,
  Repeat,
  Globe,
  Mail,
  Crown,
  Download,
  Printer,
  Image as ImageIcon,
  Presentation,
  FileSpreadsheet,
  Network,
  ChevronUp,
  ChevronDown,
  ListChecks,
  Flag,
  Columns2,
} from "lucide-react";
import { DependencyMap } from "./depmap";
import {
  type Plan,
  type Project,
  type ProjectStatus,
  type Kind,
  type Person,
  type Assignment,
  type AssignmentTask,
  type TaskType,
  type PersonStatus,
  type WorkItem,
  type TaskItem,
  parseItemLines,
  toggleTaskItem,
  ITEMS_MAX,
  ITEM_TEXT_MAX,
  workItemsOf,
  workItemUses,
  workItemProjects,
  openBlockers,
  blockerLabels,
  workItemParts,
  refDone,
  refLabel,
  dependentsOf,
  workStatusLabels,
  projectSegments,
  periodsOf,
  scheduleSummary,
  type Schedule,
  type ScheduleMode,
  type TeachingPeriod,
  MODES_FOR,
  modeLabels,
  WEEKDAYS,
  currentEnd,
  dateKey,
  parseDate,
  scheduleDays,
  teamFullName,
  teamAbbr,
  projectLabel,
  coordinatorId,
  coordinatorFirst,
  personStatuses,
  personStatusLabels,
  taskLibrary,
  tracksCapacity,
  uid,
  personLoad,
  analyticsData,
  anMeasureLabels,
  anGroupLabels,
  type AnQuery,
  type AnMeasure,
  type AnGroup,
  type AnScope,
  personInvolvement,
  involvementSignal,
  usesPercent,
  involvement,
  countsNow,
  overloadLevel,
  assignmentCounts,
  projectStatuses,
  kinds,
  kindLabels,
  kindOf,
  isActivity,
  stageLabel,
  projectStageLabel,
  stageDefs,
  stageKey,
  stageOrder,
  typeFilterOptions,
  funderOptions,
  centreOptions,
  centreShort,
  milestonesOf,
  milestoneState,
  milestoneKindLabels,
  teamMilestones,
  movedText,
  rolesOf,
  rolesText,
} from "./model";
import { MilestoneList, MilestonesView, NextMilestone, MilestoneBadge, PersonDeadlines, msDay, msWhen } from "./milestones";
import { personCard, printCard, downloadCardExcel } from "./card";
import { plansToMarkwhen } from "./markwhen";
import { downloadPng, downloadSlide, downloadBlob, fileSafe, NO_EXPORT } from "./snapshot";
import { editableSlides, cssColour, type SlideCard } from "./slide";
import { download } from "./storage";

type OpenArg = {
  type: "person" | "project" | "projectView" | "assignment" | "cell" | "team" | "allocation" | "workitem";
  id?: string;
  personId?: string;
  projectId?: string;
  kind?: Kind;
  back?: OpenArg;
};
type Open = (m: OpenArg) => void;

// Accent palette for type tags, top edges and rings. Same order in both themes.
export const ACCENTS = ["blue", "violet", "green", "amber", "rose", "teal", "orange"];
const FIXED: Record<string, string> = {
  research: "blue",
  teaching: "violet",
  development: "green",
  infrastructure: "orange",
  other: "rose",
};
export function accentFor(key: string | undefined): string {
  if (!key) return "slate";
  const k = key.trim().toLowerCase();
  if (FIXED[k]) return FIXED[k];
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  // Project types avoid the activity colours (violet, teal, amber, rose).
  const TYPE_ACCENTS = ["blue", "green", "orange"];
  return TYPE_ACCENTS[h % TYPE_ACCENTS.length];
}

// Activities always use their kind's colour; projects use their type.
export const KIND_ACC: Record<Kind, string> = {
  project: "blue",
  teaching: "violet",
  supervision: "teal",
  networking: "amber",
  other: "rose",
};
export function accentOf(p: Project, byName = true): string {
  if (isActivity(p)) return KIND_ACC[kindOf(p)];
  return accentFor(p.type || (byName ? p.name : undefined));
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
};

/** Photos by person name (names are unique in a team), provided by the app. */
export const PhotoContext = createContext<Map<string, string>>(new Map());
/** Saves a change to the plan (with Undo); lets lists tick tasks without opening a dialog. */
export const PatchContext = createContext<((fn: (p: Plan) => void, message?: string) => void) | null>(null);
export const usePhoto = (name: string) => useContext(PhotoContext).get(name);

export function Ring({
  name,
  tone = "slate",
  size = 44,
  pct,
}: {
  name: string;
  tone?: string;
  size?: number;
  pct?: number | null;
}) {
  // Initials inside a ring; the ring arc shows utilisation when known.
  const r = size / 2 - 2.5,
    c = 2 * Math.PI * r,
    p = pct == null ? 1 : Math.max(0, Math.min(1, pct));
  const photo = usePhoto(name);
  return (
    <span className={`ring t-${tone}${photo ? " has-photo" : ""}`} style={{ width: size, height: size }}>
      {photo && (
        <img
          className="ring-photo"
          src={photo}
          alt=""
          style={{ top: size >= 40 ? 4 : 3, left: size >= 40 ? 4 : 3, width: size - (size >= 40 ? 8 : 6), height: size - (size >= 40 ? 8 : 6) }}
        />
      )}
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fg"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {!photo && <b style={{ fontSize: Math.round(size * 0.3) }}>{initials(name)}</b>}
    </span>
  );
}

/* ------------------------------------------------------------ Tasks and status */

export const STATUS_TONE: Record<PersonStatus, string> = {
  full: "orange",
  steady: "green",
  room: "blue",
};
export function statusTone(p: Person) {
  return p.status ? STATUS_TONE[p.status] : "slate";
}
export function StatusPill({ person }: { person: Person }) {
  return (
    <span className={`status-pill t-${statusTone(person)}`} title={person.statusNote || undefined}>
      <i />
      {person.status ? personStatusLabels[person.status] : "Status not set"}
    </span>
  );
}
export function taskName(lib: TaskType[], id: string) {
  return lib.find((t) => t.id === id)?.name;
}
export function TaskChip({
  task,
  note,
  extra,
  linked,
}: {
  task: TaskType;
  note?: string;
  extra?: string;
  /** Name of the shared work item this task belongs to. */
  linked?: string;
}) {
  const title = [note, linked && `Part of shared work: ${linked}`].filter(Boolean).join("\n");
  return (
    <span className={`task-chip t-${task.color || "slate"}`} title={title || undefined}>
      {linked && <Link2 size={11} aria-label="Shared work" />}
      {task.name}
      {extra && <em>{extra}</em>}
    </span>
  );
}
const shortProject = (n: string) => (n.length > 28 ? n.slice(0, 26) + "…" : n);
/** "Test piece batch A, shared with CleanCut · waits on Fixture design" for one assignment. */
export function SharedLines({
  plan,
  a,
}: {
  plan: Plan;
  a: Assignment;
}) {
  const ids = [...new Set((a.tasks ?? []).map((t) => t.workItemId).filter(Boolean))] as string[];
  const items = workItemsOf(plan).filter((w) => ids.includes(w.id) && w.status !== "done");
  if (!items.length) return null;
  return (
    <span className="shared-lines">
      {items.map((w) => {
        const others = workItemProjects(plan, w.id)
          .filter((id) => id !== a.projectId)
          .map((id) => plan.projects.find((x) => x.id === id)?.name)
          .filter(Boolean) as string[];
        const wait = blockerLabels(plan, w);
        return (
          <span key={w.id} className="shared-line">
            <span className={`shared-badge ws-${w.status}`}>
              <Link2 size={12} />
              {w.name}
            </span>
            {others.length > 0 && (
              <span className="muted">shared with {others.map(shortProject).join(", ")}</span>
            )}
            {wait.length > 0 && (
              <span className="waits">
                <Hourglass size={12} />
                waits on {wait.join(", ")}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
/** Chips for one assignment's tasks, in library order. */
export function AssignmentTasks({
  plan,
  a,
  max = 6,
}: {
  plan: Plan;
  a: Assignment;
  max?: number;
}) {
  const lib = taskLibrary(plan);
  const list = (a.tasks ?? [])
    .map((t) => ({ t, task: lib.find((x) => x.id === t.taskId) }))
    .filter((x): x is { t: AssignmentTask; task: TaskType } => !!x.task);
  if (!list.length) return null;
  return (
    <span className="task-chips">
      {list.slice(0, max).map(({ t, task }) => (
        <TaskChip
          key={t.taskId}
          task={task}
          note={t.note}
          linked={t.workItemId ? workItemsOf(plan).find((w) => w.id === t.workItemId)?.name : undefined}
        />
      ))}
      {list.length > max && <em className="more">+{list.length - max}</em>}
    </span>
  );
}
/** Concrete tasks under each task group of an assignment, with tick boxes when the plan can be changed here. */
export function TaskItemsList({ plan, a, max = 6 }: { plan: Plan; a: Assignment; max?: number }) {
  const patch = useContext(PatchContext);
  const lib = taskLibrary(plan);
  const groups = (a.tasks ?? []).filter((t) => t.items?.length);
  const [all, setAll] = useState(false);
  if (!groups.length) return null;
  let shown = 0,
    hidden = 0;
  return (
    <div className="titem-list">
      {groups.map((t) => {
        const task = lib.find((x) => x.id === t.taskId);
        const items = t.items!;
        const done = items.filter((i) => i.done).length;
        const visible = items.filter((i) => {
          if (all || shown < max) {
            shown++;
            return true;
          }
          hidden++;
          return false;
        });
        if (!visible.length) return null;
        return (
          <div key={t.taskId} className="titem-group">
            <div className="titem-head">
              {task && <TaskChip task={task} />}
              <small className="muted">
                {done}/{items.length} done
              </small>
            </div>
            <ol>
              {visible.map((i) => (
                <li key={i.id} className={i.done ? "done" : ""}>
                  {patch ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!i.done}
                        onChange={() => {
                          let on = false;
                          patch((p) => {
                            on = toggleTaskItem(p, a.id, t.taskId, i.id);
                          }, `${i.text.length > 40 ? i.text.slice(0, 38) + "…" : i.text}: ${!i.done ? "done" : "open again"}`);
                          return on;
                        }}
                      />
                      <span>{i.text}</span>
                    </label>
                  ) : (
                    <span>{i.text}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      {(hidden > 0 || all) && (
        <button type="button" className="text-btn titem-more" onClick={() => setAll((x) => !x)}>
          {all ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

/** Numbered concrete tasks under one task group: add (or paste a list), tick, reorder, edit, remove. */
export function TaskItemsEditor({
  group,
  items,
  onChange,
}: {
  group: string;
  items: TaskItem[];
  onChange: (items: TaskItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [openEditor, setOpenEditor] = useState(items.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const addLines = (lines: string[]) => {
    const room = ITEMS_MAX - items.length;
    const add = lines.slice(0, Math.max(0, room)).map((text) => ({ id: `i-${uid().slice(0, 8)}`, text }));
    if (add.length) onChange([...items, ...add]);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const done = items.filter((i) => i.done).length;
  if (!openEditor)
    return (
      <button
        type="button"
        className="text-btn titem-open"
        onClick={() => {
          setOpenEditor(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <ListChecks size={14} />
        Add detailed tasks
      </button>
    );
  return (
    <div className="titems">
      {items.length > 0 && (
        <ol>
          {items.map((it, i) => (
            <li key={it.id} className={it.done ? "done" : ""}>
              <span className="titem-num">{i + 1}.</span>
              <input
                type="checkbox"
                aria-label={`Finished: ${it.text}`}
                checked={!!it.done}
                onChange={() =>
                  onChange(items.map((x) => (x.id === it.id ? (x.done ? { id: x.id, text: x.text } : { ...x, done: true }) : x)))
                }
              />
              <input
                className="titem-text"
                aria-label={`Task ${i + 1} in ${group}`}
                value={it.text}
                maxLength={ITEM_TEXT_MAX}
                onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
                onBlur={(e) => {
                  if (!e.target.value.trim()) onChange(items.filter((x) => x.id !== it.id));
                }}
              />
              <span className="titem-tools">
                <button type="button" className="icon-btn" aria-label={`Move ${it.text} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${it.text} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${it.text}`}
                  onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                >
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="titem-add">
        <input
          ref={inputRef}
          aria-label={`Add a task in ${group}`}
          placeholder={`Add a task in ${group}, press Enter (or paste a list)`}
          maxLength={ITEM_TEXT_MAX}
          value={draft}
          disabled={items.length >= ITEMS_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            const lines = parseItemLines(text);
            if (lines.length > 1) {
              e.preventDefault();
              addLines(lines);
              setDraft("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const lines = parseItemLines(draft);
              if (lines.length) addLines(lines);
              setDraft("");
            }
          }}
          onBlur={() => {
            const lines = parseItemLines(draft);
            if (lines.length) addLines(lines);
            setDraft("");
          }}
        />
        {done > 0 && (
          <button type="button" className="text-btn" onClick={() => onChange(items.filter((x) => !x.done))}>
            Clear finished ({done})
          </button>
        )}
      </div>
    </div>
  );
}

/** Pick a project's task groups as chips; a new name adds a group to the library. */
export function GroupPicker({
  library,
  value,
  onChange,
  onAddTask,
}: {
  library: TaskType[];
  value: string[];
  onChange: (v: string[]) => void;
  onAddTask: (name: string) => TaskType;
}) {
  const [draft, setDraft] = useState("");
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    const t = library.find((x) => x.name.toLowerCase() === name.toLowerCase()) ?? onAddTask(name);
    if (!value.includes(t.id)) onChange([...value, t.id]);
    setDraft("");
  };
  return (
    <div className="task-options" role="group" aria-label="Task groups">
      {library.map((t) => (
        <button
          type="button"
          key={t.id}
          className={`task-chip pick t-${t.color || "slate"} ${value.includes(t.id) ? "on" : ""}`}
          aria-pressed={value.includes(t.id)}
          onClick={() => toggle(t.id)}
        >
          {t.name}
        </button>
      ))}
      <span className="task-new">
        <input
          aria-label="New task group"
          placeholder="+ New group"
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </span>
    </div>
  );
}

/** Pick tasks as chips; selected ones get an optional one-line note. */
/** Type or pick a shared work item; a new name creates one. */
function WorkItemField({
  items,
  value,
  onChange,
  onCreate,
  label,
}: {
  items: WorkItem[];
  value?: string;
  onChange: (id: string | undefined) => void;
  onCreate: (name: string) => WorkItem;
  label: string;
}) {
  const current = items.find((w) => w.id === value)?.name ?? "";
  const [text, setText] = useState(current);
  const [focus, setFocus] = useState(false);
  const commit = () => {
    setFocus(false);
    const name = text.trim();
    if (!name) return onChange(undefined);
    const found = items.find((w) => w.name.toLowerCase() === name.toLowerCase());
    const w = found ?? onCreate(name);
    setText(w.name);
    onChange(w.id);
  };
  return (
    <span className={`wi-field ${value ? "on" : ""}`}>
      <Link2 size={13} />
      <input
        aria-label={label}
        placeholder="Shared work (optional)"
        list="work-items-list"
        maxLength={120}
        value={focus ? text : current || text}
        onFocus={() => {
          setText(current);
          setFocus(true);
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
      />
    </span>
  );
}
export function TaskPicker({
  library,
  value,
  onChange,
  onAddTask,
  items,
  onAddItem,
  hint,
  groups,
}: {
  library: TaskType[];
  value: AssignmentTask[];
  onChange: (v: AssignmentTask[]) => void;
  onAddTask: (name: string) => TaskType;
  /** Shared work items; when given, each task can be linked to one. */
  items?: WorkItem[];
  onAddItem?: (name: string) => WorkItem;
  /** Short context for a linked work item, e.g. "Also: Machining in CleanCut (Karim H.)". */
  hint?: (workItemId: string) => string;
  /** The project's task groups: shown first, the rest behind "More groups". */
  groups?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [more, setMore] = useState(false);
  const has = (id: string) => value.some((v) => v.taskId === id);
  const toggle = (id: string) =>
    onChange(has(id) ? value.filter((v) => v.taskId !== id) : [...value, { taskId: id }]);
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    const found = library.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const task = found ?? onAddTask(name);
    if (!has(task.id)) onChange([...value, { taskId: task.id }]);
    setDraft("");
  };
  return (
    <div className="task-picker">
      <div className="task-options" role="group" aria-label="Task groups">
        {library
          .filter((t) => more || !groups?.length || groups.includes(t.id) || has(t.id))
          .map((t) => (
          <button
            type="button"
            key={t.id}
            className={`task-chip pick t-${t.color || "slate"} ${has(t.id) ? "on" : ""}`}
            aria-pressed={has(t.id)}
            onClick={() => toggle(t.id)}
          >
            {t.name}
          </button>
        ))}
        {groups && groups.length > 0 && library.some((t) => !groups.includes(t.id) && !has(t.id)) && (
          <button type="button" className="text-btn more-groups" aria-expanded={more} onClick={() => setMore((x) => !x)}>
            {more ? "Project groups only" : `More groups (${library.filter((t) => !groups.includes(t.id) && !has(t.id)).length})`}
          </button>
        )}
        <span className="task-new">
          <input
            aria-label="New task group"
            placeholder="+ New group"
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
          />
        </span>
      </div>
      {value.length > 0 && (
        <div className="task-notes">
          {value.map((v) => {
            const t = library.find((x) => x.id === v.taskId);
            if (!t) return null;
            return (
              <div className="task-note-row" key={v.taskId}>
                <TaskChip task={t} />
                <label className="pct-input" title="Share of full time this task takes (optional)">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    step={5}
                    inputMode="decimal"
                    aria-label={`Percent of time for ${t.name}`}
                    placeholder="–"
                    value={v.percent ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      onChange(
                        value.map((x) =>
                          x.taskId === v.taskId
                            ? e.target.value !== "" && Number.isFinite(n) && n >= 0
                              ? { ...x, percent: Math.min(200, Math.round(n)) }
                              : (({ percent: _p, ...rest }) => rest)(x)
                            : x,
                        ),
                      );
                    }}
                  />
                  <span>%</span>
                </label>
                <input
                  aria-label={`Note for ${t.name}`}
                  placeholder="Note (optional), e.g. Sa/Sq on batch 3"
                  maxLength={300}
                  value={v.note ?? ""}
                  onChange={(e) =>
                    onChange(
                      value.map((x) =>
                        x.taskId === v.taskId
                          ? e.target.value
                            ? { ...x, note: e.target.value }
                            : (({ note: _n, ...rest }) => rest)(x)
                          : x,
                      ),
                    )
                  }
                />
                {items && onAddItem && (
                  <WorkItemField
                    items={items}
                    value={v.workItemId}
                    label={`Shared work for ${t.name}`}
                    onCreate={onAddItem}
                    onChange={(id) =>
                      onChange(
                        value.map((x) => {
                          if (x.taskId !== v.taskId) return x;
                          const { workItemId: _, ...rest } = x;
                          return id ? { ...rest, workItemId: id } : rest;
                        }),
                      )
                    }
                  />
                )}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${t.name}`}
                  onClick={() => toggle(v.taskId)}
                >
                  <X size={14} />
                </button>
                {v.workItemId && hint && hint(v.workItemId) && (
                  <small className="wi-hint">{hint(v.workItemId)}</small>
                )}
                <TaskItemsEditor
                  group={t.name}
                  items={v.items ?? []}
                  onChange={(its) =>
                    onChange(
                      value.map((x) => {
                        if (x.taskId !== v.taskId) return x;
                        const { items: _i, ...rest } = x;
                        return its.length ? { ...rest, items: its } : rest;
                      }),
                    )
                  }
                />
              </div>
            );
          })}
          {items && (
            <datalist id="work-items-list">
              {items.map((w) => (
                <option key={w.id} value={w.name} />
              ))}
            </datalist>
          )}
        </div>
      )}
    </div>
  );
}
/** Unique tasks across a person's active assignments, with how many projects use each. */
export function PersonTaskSummary({
  plan,
  personId,
  max = 12,
  byProject = false,
}: {
  plan: Plan;
  personId: string;
  max?: number;
  /** One line per project with its tasks, instead of tasks merged across projects. */
  byProject?: boolean;
}) {
  const lib = taskLibrary(plan);
  const active = plan.assignments.filter((a) => a.personId === personId && a.status !== "finished" && a.tasks?.length);
  const projectName = (id: string) => plan.projects.find((x) => x.id === id)?.name ?? "";
  if (!active.length) return <span className="muted">No tasks yet</span>;
  if (byProject) {
    const rows = active
      .map((a) => ({ a, pr: plan.projects.find((x) => x.id === a.projectId) }))
      .filter((r) => r.pr)
      .sort((x, y) => x.pr!.name.localeCompare(y.pr!.name));
    return (
      <ul className="task-by-project">
        {rows.map(({ a, pr }) => (
          <li key={a.id}>
            <span className={`tbp-project t-${accentOf(pr!)}`} title={pr!.name}>
              <i />
              {pr!.name}
              {a.status === "planned" && <small>planned</small>}
            </span>
            <span className="task-chips">
              {(a.tasks ?? []).map((t) => {
                const task = lib.find((x) => x.id === t.taskId);
                return task ? <TaskChip key={t.taskId} task={task} note={t.note} /> : null;
              })}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  const where = new Map<string, string[]>();
  active.forEach((a) => (a.tasks ?? []).forEach((t) => where.set(t.taskId, [...(where.get(t.taskId) ?? []), projectName(a.projectId)])));
  const list = lib.filter((t) => where.has(t.id));
  return (
    <span className="task-chips">
      {list.slice(0, max).map((t) => (
        <TaskChip
          key={t.id}
          task={t}
          note={where.get(t.id)!.join(", ")}
          extra={where.get(t.id)!.length > 1 ? `×${where.get(t.id)!.length}` : undefined}
        />
      ))}
      {list.length > max && <em className="more">+{list.length - max}</em>}
    </span>
  );
}
export function newTaskType(name: string, library: TaskType[]): TaskType {
  const used = new Set(library.map((t) => t.color));
  const color =
    ["blue", "green", "violet", "teal", "amber", "rose", "orange"].find((c) => !used.has(c)) ??
    ["blue", "green", "violet", "teal", "amber", "rose", "orange"][library.length % 7];
  return { id: `t-${uid().slice(0, 8)}`, name: name.trim(), color };
}

export function loadTone(l: ReturnType<typeof personLoad>) {
  if (l.capacity == null) return "slate";
  if (l.over) return "red";
  const u = l.utilisation ?? 0;
  if (u >= 0.85) return "orange";
  if (u >= 0.5) return "green";
  return "blue";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
export const dayLabel = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
/** Start used for sorting: confirmed, proposed, application, then year. */
export function projectStart(p: Project): string | null {
  const d = p.dates ?? {};
  return d.start ?? d.plannedStart ?? d.appStart ?? (p.startYear != null ? `${p.startYear}-01-01` : null);
}
export function projectEnd(p: Project): string | null {
  const d = p.dates ?? {};
  return d.finishedOn ?? currentEnd(p) ?? d.plannedEnd ?? (p.endYear != null ? `${p.endYear}-12-31` : null);
}
function yearsLabel(p: Project, short = false) {
  const d = p.dates ?? {};
  const a = d.start ?? d.plannedStart,
    b = d.finishedOn ?? currentEnd(p) ?? d.plannedEnd;
  if (a || b) {
    const ext = p.extensions?.length ? (short ? "+" : " (extended)") : "";
    if (short && a && b)
      return a.slice(0, 4) === b.slice(0, 4) ? `${a.slice(0, 4)}${ext}` : `${a.slice(0, 4)}–${b.slice(0, 4)}${ext}`;
    if (a && b) return `${monthLabel(a)}–${monthLabel(b)}${ext}`;
    return a ? `From ${monthLabel(a)}` : `Until ${monthLabel(b!)}${ext}`;
  }
  if (p.startYear == null && p.endYear == null) return "";
  if (p.startYear != null && p.endYear != null)
    return p.startYear === p.endYear
      ? String(p.startYear)
      : `${p.startYear}–${p.endYear}`;
  return p.startYear != null ? `From ${p.startYear}` : `Until ${p.endYear}`;
}

/* ------------------------------------------------------- Layout toggle */

type Layout = "cards" | "list" | "timeline" | "milestones" | "split";
/* ------------------------------------------------------------ Sorting */

export type SortState = { by: string; dir: "asc" | "desc" };
export function useSort(
  key: string,
  initial: SortState,
): [SortState, (s: SortState) => void] {
  const [sort, setSort] = useState<SortState>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      if (v && typeof v.by === "string" && (v.dir === "asc" || v.dir === "desc"))
        return v;
    } catch {}
    return initial;
  });
  const set = (v: SortState) => {
    setSort(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return [sort, set];
}
/** Sort a copy; null/undefined values always go last. */
export function sortBy<T>(
  list: T[],
  value: (x: T) => string | number | null | undefined,
  dir: "asc" | "desc",
  tie: (x: T) => string,
): T[] {
  const f = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = value(a),
      vb = value(b);
    if (va == null && vb == null) return tie(a).localeCompare(tie(b));
    if (va == null) return 1;
    if (vb == null) return -1;
    const c =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
    return c !== 0 ? c * f : tie(a).localeCompare(tie(b));
  });
}
/** Fields where the natural first click is high to low. */
const DESC_FIRST = new Set(["involve", "tasks", "busy", "hours", "open", "ongoing", "planned", "team", "estimates", "start", "end"]);
export function SortControl({
  sort,
  onChange,
  options,
}: {
  sort: SortState;
  onChange: (s: SortState) => void;
  options: [string, string][];
}) {
  return (
    <span className="sort-control">
      <select
        aria-label="Sort by"
        value={sort.by}
        onChange={(e) =>
          onChange({
            by: e.target.value,
            dir: DESC_FIRST.has(e.target.value) ? "desc" : "asc",
          })
        }
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            Sort: {label}
          </option>
        ))}
      </select>
      <button
        className="icon-btn"
        aria-label={sort.dir === "asc" ? "Ascending, switch to descending" : "Descending, switch to ascending"}
        title={sort.dir === "asc" ? "Ascending" : "Descending"}
        onClick={() => onChange({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })}
      >
        {sort.dir === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
      </button>
    </span>
  );
}
export function SortTh({
  field,
  sort,
  onChange,
  className,
  children,
}: {
  field: string;
  sort: SortState;
  onChange: (s: SortState) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const on = sort.by === field;
  return (
    <th
      className={`${className ?? ""} sortable ${on ? "sorted" : ""}`}
      aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        onClick={() =>
          onChange(
            on
              ? { by: field, dir: sort.dir === "asc" ? "desc" : "asc" }
              : { by: field, dir: DESC_FIRST.has(field) ? "desc" : "asc" },
          )
        }
      >
        {children}
        {on ? (
          sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="sort-idle" />
        )}
      </button>
    </th>
  );
}

function useLayout(key: string, fallback: Layout = "cards"): [Layout, (l: Layout) => void] {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const v = localStorage.getItem(key);
      return v === "list" || v === "timeline" || v === "milestones" || v === "split" || v === "cards" ? v : fallback;
    } catch {
      return fallback;
    }
  });
  const set = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem(key, l);
    } catch {}
  };
  return [layout, set];
}
function LayoutToggle({
  value,
  onChange,
  timeline = false,
  milestones = false,
  split = false,
}: {
  value: Layout;
  onChange: (l: Layout) => void;
  timeline?: boolean;
  milestones?: boolean;
  split?: boolean;
}) {
  return (
    <div className="segmented icon-seg" role="group" aria-label="Layout">
      {split && (
        <button
          className={value === "split" ? "selected" : ""}
          aria-pressed={value === "split"}
          title="People list with details beside it"
          aria-label="People list with details beside it"
          onClick={() => onChange("split")}
        >
          <Columns2 size={15} />
        </button>
      )}
      <button
        className={value === "cards" ? "selected" : ""}
        aria-pressed={value === "cards"}
        title="Cards"
        aria-label="Cards"
        onClick={() => onChange("cards")}
      >
        <LayoutGrid size={15} />
      </button>
      <button
        className={value === "list" ? "selected" : ""}
        aria-pressed={value === "list"}
        title="List"
        aria-label="List"
        onClick={() => onChange("list")}
      >
        <ListIcon size={15} />
      </button>
      {timeline && (
        <button
          className={value === "timeline" ? "selected" : ""}
          aria-pressed={value === "timeline"}
          title="Timeline"
          aria-label="Timeline"
          onClick={() => onChange("timeline")}
        >
          <GanttChart size={15} />
        </button>
      )}
      {milestones && (
        <button
          className={value === "milestones" ? "selected" : ""}
          aria-pressed={value === "milestones"}
          title="Milestones and deadlines"
          aria-label="Milestones and deadlines"
          onClick={() => onChange("milestones")}
        >
          <Flag size={15} />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Team */

type Patch = (fn: (p: Plan) => void, message?: string) => void;
const activeTasks = (plan: Plan, personId: string) =>
  plan.assignments
    .filter((a) => a.personId === personId && a.status !== "finished")
    .reduce((t, a) => t + (a.tasks?.length ?? 0), 0);

export function TeamView({
  plan,
  week,
  weekControl,
  open,
  patch,
  teamName = "",
}: {
  plan: Plan;
  week: string;
  weekControl: React.ReactNode;
  open: Open;
  patch: Patch;
  teamName?: string;
}) {
  const track = tracksCapacity(plan);
  const [query, setQuery] = useState("");
  // v32: nothing chosen yet means the first person in the shown order (the coordinator).
  const [selected, setSelected] = useState<string>("");
  // v32: side-by-side layout (small cards left, details right) is the default.
  const [layout, setLayout] = useLayout("tc-layout-team-v32", "split");
  const detailRef = useRef<HTMLDivElement>(null);
  const splitDetailRef = useRef<HTMLDivElement>(null);
  // Selecting a person shows their details: scroll the detail pane to its top (split layout),
  // or bring the detail section into view (cards and list layouts).
  const choose = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => {
      if (layout === "split") splitDetailRef.current?.scrollTo({ top: 0 });
      else detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const [sort, setSort] = useSort("tc-sort-team", { by: "name", dir: "asc" });
  const matching = plan.people.filter((p) =>
    `${p.name} ${p.role ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const coord = coordinatorId(plan);
  const sorted = sortBy(
    matching,
    (p) => {
      const l = personLoad(plan, p.id, week);
      const c = assignmentCounts(plan, p.id);
      switch (sort.by) {
        case "role": return p.role || null;
        case "status": return p.status ? personStatuses.indexOf(p.status) : null;
        case "tasks": return activeTasks(plan, p.id);
        case "busy": return l.utilisation;
        case "hours": return l.total;
        case "free": return l.capacity == null ? null : l.capacity - l.total;
        case "ongoing": return c.ongoing;
        case "planned": return c.planned;
        case "open": return l.missing;
        case "involve": return personInvolvement(plan, p.id).total;
        default: return p.name;
      }
    },
    sort.dir,
    (p) => p.name,
  );
  const pctOn = usesPercent(plan);
  // v27: the team coordinator always comes first, whatever the sort.
  const people = coordinatorFirst(plan, sorted, (p) => p.id);
  const person =
    plan.people.find((p) => p.id === selected) ?? people[0] ?? plan.people[0];

  return (
    <>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search people"
            placeholder="Search name or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {track && weekControl}
        <span className="grow" />
        <SortControl
          sort={sort}
          onChange={setSort}
          options={
            track
              ? [
                  ["name", "Name"],
                  ["role", "Role"],
                  ["busy", "% busy"],
                  ["hours", "Hours this week"],
                  ["free", "Free hours"],
                  ["ongoing", "Ongoing"],
                  ["planned", "Planned"],
                  ["open", "Unestimated"],
                  ["involve", "Involvement %"],
                ]
              : [
                  ["name", "Name"],
                  ["role", "Role"],
                  ["status", "Status"],
                  ["tasks", "Tasks"],
                  ["ongoing", "Ongoing"],
                  ["planned", "Planned"],
                  ["involve", "Involvement %"],
                ]
          }
        />
        <LayoutToggle value={layout} onChange={setLayout} split />
        {track && (
          <button className="btn" onClick={() => open({ type: "team" })}>
            <SlidersHorizontal size={15} />
            Team capacity
          </button>
        )}
        <button className="btn" onClick={() => open({ type: "person" })}>
          <Plus size={15} />
          Add person
        </button>
      </div>

      {layout === "split" ? (
        <div className="team-split">
          <div className="team-split-list" role="list" aria-label="People">
            {people.map((p) => {
              const l = personLoad(plan, p.id, week);
              const tone = track ? loadTone(l) : statusTone(p);
              const c = assignmentCounts(plan, p.id);
              const sel = person?.id === p.id;
              return (
                <button
                  key={p.id}
                  role="listitem"
                  className={`mini-person t-${tone} ${sel ? "selected" : ""} ${p.id === coord ? "coord" : ""}`}
                  onClick={() => choose(p.id)}
                  aria-current={sel ? "true" : undefined}
                >
                  <Ring name={p.name} tone={tone} size={40} pct={track ? l.utilisation : null} />
                  <span className="mini-person-text">
                    <strong>{p.name}</strong>
                    <small>
                      {p.id === coord ? "Coordinator · " : ""}
                      {p.role || "Role not set"}
                    </small>
                    <small className="mini-person-meta">
                      {c.active} {c.active === 1 ? "project" : "projects"}
                      {!track && p.status ? ` · ${personStatusLabels[p.status]}` : ""}
                    </small>
                  </span>
                  {pctOn && <InvolvementMeter plan={plan} personId={p.id} />}
                </button>
              );
            })}
            {!people.length && <p className="muted pad">No matching people.</p>}
          </div>
          <div className="team-split-detail" ref={splitDetailRef}>
            {person && (
              <MemberDetail plan={plan} week={week} personId={person.id} open={open} patch={patch} teamName={teamName} />
            )}
          </div>
        </div>
      ) : layout === "list" ? (
        <div className="card table-card list-card">
          <div className="scroll-table">
            <table className="list-table">
              <thead>
                <tr>
                  <SortTh field="name" sort={sort} onChange={setSort}>Person</SortTh>
                  <SortTh field="role" sort={sort} onChange={setSort}>Role</SortTh>
                  {track ? (
                    <>
                      <SortTh field="busy" sort={sort} onChange={setSort}>This week</SortTh>
                      <SortTh field="hours" sort={sort} onChange={setSort} className="num">Hours</SortTh>
                    </>
                  ) : (
                    <>
                      <SortTh field="status" sort={sort} onChange={setSort}>Status</SortTh>
                      <SortTh field="tasks" sort={sort} onChange={setSort}>Current tasks</SortTh>
                    </>
                  )}
                  <SortTh field="ongoing" sort={sort} onChange={setSort} className="num">Ongoing</SortTh>
                  <SortTh field="planned" sort={sort} onChange={setSort} className="num">Planned</SortTh>
                  {pctOn && <SortTh field="involve" sort={sort} onChange={setSort}>Involvement</SortTh>}
                  {track && (
                    <SortTh field="open" sort={sort} onChange={setSort} className="num">Unestimated</SortTh>
                  )}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const l = personLoad(plan, p.id, week);
                  const c = assignmentCounts(plan, p.id);
                  const tone = track ? loadTone(l) : statusTone(p);
                  return (
                    <tr
                      key={p.id}
                      className={`click-row ${person?.id === p.id ? "row-selected" : ""} ${p.id === coord ? "coord-row" : ""}`}
                      onClick={() => choose(p.id)}
                    >
                      <th>
                        <span className="cell-person">
                          <Ring name={p.name} tone={tone} size={28} pct={track ? l.utilisation : null} />
                          {p.name}
                          {p.id === coord && <span className="coord-badge">Coordinator</span>}
                        </span>
                      </th>
                      <td className="muted">{p.role || "–"}</td>
                      {track ? (
                        <>
                          <td>
                            {l.capacity == null ? (
                              <span className="muted">Capacity not set</span>
                            ) : (
                              <span className={`mini-bar t-${tone}`}>
                                <i style={{ width: `${Math.min(90, (l.utilisation ?? 0) * 90)}px` }} />
                                <b>{Math.round((l.utilisation ?? 0) * 100)}%</b>
                              </span>
                            )}
                          </td>
                          <td className="num">
                            {fmt(l.total)}
                            {l.capacity != null ? ` / ${fmt(l.capacity)}` : ""} h
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <StatusPill person={p} />
                          </td>
                          <td className="tasks-cell">
                            <PersonTaskSummary plan={plan} personId={p.id} max={3} />
                          </td>
                        </>
                      )}
                      <td className="num">{c.ongoing || "–"}</td>
                      <td className="num">{c.planned || "–"}</td>
                      {pctOn && (
                        <td>
                          <InvolvementMeter plan={plan} personId={p.id} />
                        </td>
                      )}
                      {track && (
                        <td className={`num ${l.missing ? "c-orange" : "muted"}`}>{l.missing || "–"}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="tile-grid">
        {people.map((p) => {
          const l = personLoad(plan, p.id, week);
          const tone = track ? loadTone(l) : statusTone(p);
          const pct = track ? l.utilisation : null;
          const open = l.missing;
          if (!track) {
            const c = assignmentCounts(plan, p.id);
            const n = activeTasks(plan, p.id);
            return (
              <button
                key={p.id}
                className={`tile t-${tone} ${person?.id === p.id ? "selected" : ""} ${p.id === coord ? "coord" : ""}`}
                onClick={() => choose(p.id)}
                aria-pressed={person?.id === p.id}
              >
                {p.id === coord && <span className="coord-badge tile-coord">Coordinator</span>}
                <Ring name={p.name} tone={tone} size={88} pct={null} />
                <strong>{shortName(p.name)}</strong>
                <small>{p.role || " "}</small>
                <StatusPill person={p} />
                {pctOn && <InvolvementMeter plan={plan} personId={p.id} />}
                <small className="tile-meta">
                  {c.active} {c.active === 1 ? "project" : "projects"} · {n}{" "}
                  {n === 1 ? "task" : "tasks"}
                </small>
              </button>
            );
          }
          return (
            <button
              key={p.id}
              className={`tile t-${tone} ${person?.id === p.id ? "selected" : ""} ${p.id === coord ? "coord" : ""}`}
              onClick={() => choose(p.id)}
              aria-pressed={person?.id === p.id}
            >
              {p.id === coord && <span className="coord-badge tile-coord">Coordinator</span>}
              <Ring name={p.name} tone={tone} size={88} pct={pct} />
              <strong>{shortName(p.name)}</strong>
              <small>{p.role || " "}</small>
              <span className="busy-pill">
                <i style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%` }} />
                <span>
                  {l.capacity == null
                    ? open
                      ? ""
                      : "Capacity not set"
                    : `${l.missing ? "≥" : ""}${Math.round((pct ?? 0) * 100)}% busy`}
                  {open ? `${l.capacity == null ? "" : " · "}${open} open` : ""}
                </span>
              </span>
              {pctOn && <InvolvementMeter plan={plan} personId={p.id} />}
            </button>
          );
        })}
        {!people.length && <p className="muted pad">No matching people.</p>}
      </div>
      )}

      {person && layout !== "split" && (
        <div ref={detailRef} className="member-detail-anchor">
          <MemberDetail plan={plan} week={week} personId={person.id} open={open} patch={patch} teamName={teamName} />
        </div>
      )}
    </>
  );
}

function StatusEditor({ person: p, patch }: { person: Person; patch: Patch }) {
  const [note, setNote] = useState(p.statusNote ?? "");
  React.useEffect(() => setNote(p.statusNote ?? ""), [p.id, p.statusNote]);
  const set = (fn: (x: Person) => void, msg: string) =>
    patch((plan) => {
      const x = plan.people.find((y) => y.id === p.id);
      if (x) fn(x);
    }, msg);
  return (
    <div className="status-editor">
      <div className="cap-head">
        <span>How full is the plate?</span>
        <span className="muted">Set by {p.name.split(" ")[0]}</span>
      </div>
      <div className="status-options" role="radiogroup" aria-label="Status">
        {personStatuses.map((st) => (
          <button
            key={st}
            role="radio"
            aria-checked={p.status === st}
            className={`status-opt t-${STATUS_TONE[st]} ${p.status === st ? "on" : ""}`}
            onClick={() =>
              set(
                (x) => {
                  if (x.status === st) delete x.status;
                  else x.status = st;
                },
                p.status === st ? "Status cleared" : `Status: ${personStatusLabels[st]}`,
              )
            }
          >
            <i />
            {personStatusLabels[st]}
          </button>
        ))}
      </div>
      <input
        className="status-note"
        aria-label="Status note"
        placeholder="Optional note, e.g. Thesis writing until March"
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note.trim() === (p.statusNote ?? "")) return;
          set((x) => {
            if (note.trim()) x.statusNote = note.trim();
            else delete x.statusNote;
          }, "Status note saved");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

/** "Download card": print or save as PDF, or an Excel file, for one person. */
function CardMenu({
  plan,
  personId,
  teamName,
  target,
  editable,
}: {
  plan: Plan;
  personId: string;
  teamName: string;
  /** The card and assignments as shown, for the picture and the slide. */
  target?: () => HTMLElement | null;
  /** The same content as data, for the editable slides. */
  editable?: () => SlideCard;
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picBusy, setPicBusy] = useState<"" | "png" | "pptx" | "edit">("");
  const [picError, setPicError] = useState("");
  const personName = plan.people.find((x) => x.id === personId)?.name ?? "Person";
  const picture = async (kind: "png" | "pptx" | "edit") => {
    const el = target?.();
    if (!el && kind !== "edit") return;
    setPicBusy(kind);
    setPicError("");
    try {
      // Let the menu close first so it is not in the picture.
      setOpenMenu(false);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const day = new Date().toISOString().slice(0, 10);
      if (kind === "edit") {
        if (!editable) return;
        downloadBlob(await editableSlides(editable()), `${fileSafe(`${personName} ${day} editable`)}.pptx`);
      } else if (kind === "png") await downloadPng(el!, `${personName} ${day}`);
      else await downloadSlide(el!, `${personName} ${day}`, [teamName, day].filter(Boolean).join(" · "));
    } catch (e) {
      setPicError(e instanceof Error ? e.message : "The picture could not be made.");
      setOpenMenu(true);
    } finally {
      setPicBusy("");
    }
  };
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [openMenu]);
  const card = () => personCard(plan, personId, teamName);
  return (
    <div className="card-menu" ref={ref}>
      <button
        className="icon-btn"
        aria-label="Download card"
        aria-haspopup="menu"
        aria-expanded={openMenu}
        title="Download card (picture, slide, PDF or Excel)"
        disabled={!!picBusy}
        onClick={() => setOpenMenu(!openMenu)}
      >
        {picBusy ? <span className="spin-dot" aria-label="Preparing" /> : <Download size={15} />}
      </button>
      {openMenu && (
        <div className="dropdown card-dropdown" role="menu">
          <p className="dropdown-caption">Download this card</p>
          {target && (
            <>
              <button role="menuitem" disabled={!!picBusy} onClick={() => picture("png")}>
                <ImageIcon size={16} />
                <span>
                  Picture (PNG)
                  <small>Card and assignments as shown, in high resolution</small>
                </span>
              </button>
              <button role="menuitem" disabled={!!picBusy} onClick={() => picture("pptx")}>
                <Presentation size={16} />
                <span>
                  Slide (PowerPoint)
                  <small>The same picture on a 16:9 slide; opens in Keynote and Google Slides too</small>
                </span>
              </button>
              {editable && (
                <button role="menuitem" disabled={!!picBusy} onClick={() => picture("edit")}>
                  <Pencil size={16} />
                  <span>
                    Editable slide (PowerPoint)
                    <small>Text, shapes and a table you can change; long lists continue on more slides</small>
                  </span>
                </button>
              )}
              {picError && <p className="dropdown-error" role="alert">{picError}</p>}
              <hr className="dropdown-sep" />
            </>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpenMenu(false);
              printCard(card());
            }}
          >
            <Printer size={16} />
            <span>
              PDF or print
              <small>Choose "Save as PDF" in the print dialog</small>
            </span>
          </button>
          <button
            role="menuitem"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadCardExcel(card());
              } finally {
                setBusy(false);
                setOpenMenu(false);
              }
            }}
          >
            <FileSpreadsheet size={16} />
            <span>
              {busy ? "Preparing…" : "Excel"}
              <small>Projects, tasks{tracksCapacity(plan) ? " and planned hours" : ""}, one row per task</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

type PersonFocus = "projects" | "tasks" | "timeline";
/** One person's work by task group across projects, with detailed tasks to tick. */
function TasksFocus({ plan, list, open, patch }: { plan: Plan; list: Assignment[]; open: Open; patch: Patch }) {
  const lib = taskLibrary(plan);
  const live = list.filter((a) => a.status !== "finished");
  const groups = lib
    .map((t) => ({
      t,
      rows: live
        .map((a) => ({ a, at: (a.tasks ?? []).find((x) => x.taskId === t.id), pr: plan.projects.find((x) => x.id === a.projectId)! }))
        .filter((r): r is { a: Assignment; at: AssignmentTask; pr: Project } => !!r.at && !!r.pr),
    }))
    .filter((g) => g.rows.length);
  const none = live.filter((a) => !(a.tasks ?? []).length);
  if (!live.length) return <p className="muted pad">Nothing ongoing or planned here.</p>;
  return (
    <div className="tfocus">
      {groups.map(({ t, rows }) => {
        const items = rows.flatMap((r) => r.at.items ?? []);
        const openN = items.filter((i) => !i.done).length;
        return (
          <div key={t.id} className="tf-group">
            <div className="tf-head">
              <TaskChip task={t} />
              <small className="muted">
                {rows.length} {rows.length === 1 ? "project" : "projects"}
                {items.length ? ` · ${openN} of ${items.length} open` : ""}
              </small>
            </div>
            <ul>
              {rows.map(({ a, at, pr }) => (
                <li key={a.id}>
                  <button className="tf-project" onClick={() => open({ type: "cell", personId: a.personId, projectId: a.projectId })}>
                    <i className={`dot-acc t-${accentOf(pr)}`} />
                    <span>{pr.name}</span>
                    {at.note && <small className="muted">{at.note}</small>}
                    {a.status === "planned" && <span className="pill s-planned">Planned</span>}
                  </button>
                  {(at.items ?? []).length > 0 && (
                    <ol className="tf-items">
                      {at.items!.map((i) => (
                        <li key={i.id} className={i.done ? "done" : ""}>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!i.done}
                              onChange={() =>
                                patch(
                                  (pl) => void toggleTaskItem(pl, a.id, at.taskId, i.id),
                                  `${i.text.length > 40 ? i.text.slice(0, 38) + "…" : i.text}: ${!i.done ? "done" : "open again"}`,
                                )
                              }
                            />
                            <span>{i.text}</span>
                          </label>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {none.length > 0 && (
        <div className="tf-group">
          <div className="tf-head">
            <span className="muted">No task group yet</span>
          </div>
          <ul>
            {none.map((a) => {
              const pr = plan.projects.find((x) => x.id === a.projectId)!;
              return (
                <li key={a.id}>
                  <button className="tf-project" onClick={() => open({ type: "cell", personId: a.personId, projectId: a.projectId })}>
                    <i className={`dot-acc t-${accentOf(pr)}`} />
                    <span>{pr.name}</span>
                    <small className="muted">Add a task group</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemberDetail({
  plan,
  week,
  personId,
  open,
  patch,
  teamName,
}: {
  plan: Plan;
  week: string;
  personId: string;
  open: Open;
  patch: Patch;
  teamName: string;
}) {
  const track = tracksCapacity(plan);
  const p = plan.people.find((x) => x.id === personId)!;
  const l = personLoad(plan, p.id, week);
  const c = assignmentCounts(plan, p.id);
  const tone = track ? loadTone(l) : statusTone(p);
  const assignments = plan.assignments
    .filter((a) => a.personId === p.id)
    .sort(
      (a, b) =>
        ["ongoing", "planned", "finished"].indexOf(a.status) -
        ["ongoing", "planned", "finished"].indexOf(b.status),
    );
  const hoursOf = (assignmentId: string) =>
    plan.allocations.find(
      (x) => x.assignmentId === assignmentId && x.week === week,
    )?.hours ?? 0;
  // Assignments panel: what to focus on (projects, task groups or a timeline) and which kind to show.
  const [focus, setFocusState] = useState<PersonFocus>(() => {
    try {
      const v = localStorage.getItem("tc-person-focus");
      return v === "tasks" || v === "timeline" ? v : "projects";
    } catch {
      return "projects";
    }
  });
  const setFocus = (v: PersonFocus) => {
    setFocusState(v);
    try {
      localStorage.setItem("tc-person-focus", v);
    } catch {
      /* private window */
    }
  };
  const [kindPick, setKindPick] = useState<Kind | "all">("all");
  const kindsHere = kinds.filter((k) =>
    assignments.some((a) => kindOf(plan.projects.find((x) => x.id === a.projectId)) === k),
  );
  const kindSel = kindPick !== "all" && kindsHere.includes(kindPick) ? kindPick : "all";
  const shown = assignments.filter(
    (a) => kindSel === "all" || kindOf(plan.projects.find((x) => x.id === a.projectId)) === kindSel,
  );
  // Capacity split by project for the selected week.
  const segments = assignments
    .filter((a) => a.status !== "finished")
    .map((a) => {
      const pr = plan.projects.find((x) => x.id === a.projectId)!;
      return { a, pr, h: hoursOf(a.id) };
    })
    .filter((s) => s.h > 0)
    .sort((x, y) => y.h - x.h);
  const byKind = kinds
    .map((k) => ({
      k,
      h: segments
        .filter((x) => kindOf(x.pr) === k)
        .reduce((t, x) => t + x.h, 0),
    }))
    .filter((x) => x.h > 0);
  const noteOf = (assignmentId: string) =>
    plan.allocations.find(
      (x) => x.assignmentId === assignmentId && x.week === week,
    )?.note;
  const base = Math.max(l.capacity ?? 0, l.total, 1);
  const free = l.capacity != null ? Math.max(0, l.capacity - l.total) : 0;
  const gridRef = useRef<HTMLDivElement>(null);
  const photo = usePhoto(p.name);
  const today = dateKey(new Date());
  /** The card and the listed assignments (current type filter) as data for editable slides. */
  const slideData = (): SlideCard => {
    const lib = taskLibrary(plan);
    const col = (tone: string) => cssColour(`--c-${tone}`) || cssColour("--c-slate");
    const day = new Date().toISOString().slice(0, 10);
    const statusCol: Record<string, string> = { ongoing: col("blue"), planned: col("amber"), finished: cssColour("--tertiary") };
    return {
      name: p.name,
      role: p.role || "Role not set",
      photo,
      ringColor: col(tone),
      stats: [
        { value: String(c.active), label: "Active projects", color: col("blue") },
        { value: String(c.finished), label: "Finished projects", color: col("green") },
        track
          ? { value: String(l.missing), label: "Not estimated", color: col(l.missing ? "orange" : "slate") }
          : { value: String(activeTasks(plan, p.id)), label: "Open tasks", color: col("violet") },
      ],
      capacity: track
        ? {
            line:
              l.capacity == null
                ? "Not set"
                : `${Math.round((l.utilisation ?? 0) * 100)}% allocated · ${fmt(l.total)} of ${fmt(l.capacity)} h`,
            parts: segments.map((x) => ({ label: x.pr.name, hours: x.h, color: col(accentOf(x.pr)) })),
            total: base,
          }
        : undefined,
      status: track
        ? undefined
        : { label: p.status ? personStatusLabels[p.status] : "Status not set", note: p.statusNote, color: col(statusTone(p)) },
      summary: `${c.ongoing} ongoing · ${c.planned} planned · ${c.finished} finished`,
      filter: kindSel !== "all" ? `Showing ${kindLabels[kindSel]}` : undefined,
      rows: shown.map((a) => {
        const pr = plan.projects.find((x) => x.id === a.projectId)!;
        const tasks = (a.tasks ?? []).map((t) => ({ t, task: lib.find((x) => x.id === t.taskId) })).filter((x) => x.task);
        return {
          color: col(accentOf(pr)),
          title: pr.name,
          meta:
            [
              isActivity(pr) ? kindLabels[kindOf(pr)] : pr.type,
              pr.funder,
              isActivity(pr) && pr.schedule ? scheduleSummary(pr.schedule, periodsOf(plan)) : yearsLabel(pr),
            ]
              .filter(Boolean)
              .join(" · ") || projectStageLabel(pr),
          chips: tasks.map(({ t, task }) => ({ text: t.note ? `${task!.name}: ${t.note}` : task!.name, color: col(task!.color || "slate") })),
          groups: tasks
            .filter(({ t }) => t.items?.length)
            .map(({ t, task }) => ({
              name: task!.name,
              color: col(task!.color || "slate"),
              done: t.items!.filter((i) => i.done).length,
              items: t.items!.map((i) => ({ text: i.text, done: !!i.done })),
            })),
          note: [a.notes, track && noteOf(a.id) && `This week: ${noteOf(a.id)}`].filter(Boolean).join(" · ") || undefined,
          points:
            a.status === "finished"
              ? []
              : milestonesOf(pr)
                  .filter((m) => !m.done || m.date >= today)
                  .slice(0, 6)
                  .map((m) => {
                    const st = milestoneState(m, today);
                    return {
                      kind: m.kind,
                      text: `${m.kind === "deadline" ? "Deadline" : "Milestone"} ${dayLabel(m.date)}: ${m.title}${msWhen(m, today) && st !== "done" ? ` (${msWhen(m, today).toLowerCase()})` : ""}${m.movedFrom && st !== "done" ? `, moved from ${dayLabel(m.movedFrom)}` : ""}`,
                      color: st === "overdue" ? col("rose") : m.kind === "deadline" ? col("orange") : col("teal"),
                      done: st === "done",
                    };
                  }),
          right: !track || a.status === "finished" ? "" : !a.estimated ? "Not estimated" : `${fmt(hoursOf(a.id))} h this week`,
          status: a.status[0].toUpperCase() + a.status.slice(1),
          statusColor: statusCol[a.status],
        };
      }),
      caption: [teamName, day].filter(Boolean).join(" · "),
    };
  };

  return (
    <div className="member-grid" ref={gridRef}>
      <section className={`panel glow t-${tone}`}>
        <div className="member-head">
          <Ring name={p.name} tone={tone} size={112} pct={track ? l.utilisation : null} />
          <div>
            <h2>{p.name}</h2>
            <p>{p.role || "Role not set"}</p>
          </div>
          <CardMenu plan={plan} personId={p.id} teamName={teamName} target={() => gridRef.current} editable={slideData} />
          <button
            className={`icon-btn ${NO_EXPORT}`}
            aria-label={`Edit ${p.name}`}
            title="Edit person"
            onClick={() => open({ type: "person", id: p.id })}
          >
            <Pencil size={15} />
          </button>
        </div>
        <div className="stat-row">
          <div className="stat">
            <FolderKanban size={16} className="c-blue" />
            <strong>{c.active}</strong>
            <span>Active projects</span>
          </div>
          <div className="stat">
            <CheckCircle2 size={16} className="c-green" />
            <strong>{c.finished}</strong>
            <span>Finished projects</span>
          </div>
          {track ? (
            <div className="stat">
              <Clock3 size={16} className={l.missing ? "c-orange" : "c-muted"} />
              <strong>{l.missing}</strong>
              <span>Not estimated</span>
            </div>
          ) : (
            <div className="stat">
              <ListIcon size={16} className="c-violet" />
              <strong>{activeTasks(plan, p.id)}</strong>
              <span>Open tasks</span>
            </div>
          )}
        </div>
        <PersonInvolvement plan={plan} person={p} open={open} />
        <PersonDeadlines plan={plan} personId={p.id} today={today} open={open} />
        {!track && (
          <>
            <StatusEditor person={p} patch={patch} />
            <div className="cap-head">
              <span>Current tasks</span>
            </div>
            <PersonTaskSummary plan={plan} personId={p.id} byProject />
            <p className="panel-note">
              Everyone can update their own status and tasks. Weekly hours are
              optional and can be switched on in Settings.
            </p>
          </>
        )}
        {track && (<>
        <div className="cap-head">
          <span>Capacity</span>
          <span>
            {l.capacity == null
              ? "Not set"
              : `${Math.round((l.utilisation ?? 0) * 100)}% allocated · ${fmt(l.total)} of ${fmt(l.capacity)} h`}
          </span>
        </div>
        <div className="seg-bar" role="img" aria-label="Hours by project this week">
          {segments.map((s) => (
            <i
              key={s.a.id}
              className={`t-${accentOf(s.pr)}`}
              style={{ width: `${(s.h / base) * 100}%` }}
              title={`${s.pr.name}: ${fmt(s.h)} h${noteOf(s.a.id) ? ` · ${noteOf(s.a.id)}` : ""}`}
            />
          ))}
        </div>
        <div className="seg-legend">
          {segments.map((s) => (
            <span key={s.a.id}>
              <i className={`t-${accentOf(s.pr)}`} />
              {s.pr.name}
              <b>{fmt(s.h)} h</b>
            </span>
          ))}
          {l.capacity != null && (
            <span>
              <i className="t-free" />
              Unallocated
              <b>{fmt(free)} h</b>
            </span>
          )}
          {!segments.length && (
            <span className="muted">
              No hours planned for this week.{" "}
              <button
                className="text-btn"
                onClick={() => open({ type: "allocation" })}
              >
                Plan hours
              </button>
            </span>
          )}
        </div>
        {byKind.length > 1 && (
          <div className="kind-split">
            {byKind.map((x) => (
              <span key={x.k} className={`t-${KIND_ACC[x.k]}`}>
                <i />
                {kindLabels[x.k]}
                <b>{fmt(x.h)} h</b>
              </span>
            ))}
          </div>
        )}
        <p className="panel-note">
          Split by project and activity (teaching, supervision, networking).
        </p>
        </>)}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Assignments</h2>
            <p>
              {c.ongoing} ongoing · {c.planned} planned · {c.finished} finished
            </p>
          </div>
          <button
            className={`btn primary ${NO_EXPORT}`}
            onClick={() => open({ type: "assignment", personId: p.id })}
          >
            <Plus size={15} />
            Assign
          </button>
        </div>
        <div className="person-focus">
          <div className="segmented" role="group" aria-label="Focus">
            {(
              [
                ["projects", "Projects", FolderKanban],
                ["tasks", "Tasks", ListChecks],
                ["timeline", "Timeline", GanttChart],
              ] as const
            ).map(([v, label, Icon]) => (
              <button key={v} className={focus === v ? "selected" : ""} aria-pressed={focus === v} onClick={() => setFocus(v)}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          {kindsHere.length > 1 && (
            <div className="kind-filter" role="group" aria-label="Type">
              <button className={kindSel === "all" ? "on" : ""} aria-pressed={kindSel === "all"} onClick={() => setKindPick("all")}>
                All <b>{assignments.length}</b>
              </button>
              {kindsHere.map((k) => (
                <button
                  key={k}
                  className={`t-${KIND_ACC[k]} ${kindSel === k ? "on" : ""}`}
                  aria-pressed={kindSel === k}
                  onClick={() => setKindPick(k)}
                >
                  <i />
                  {k === "project" ? "Research" : kindLabels[k].replace(" activity", "")}
                  <b>{assignments.filter((a) => kindOf(plan.projects.find((x) => x.id === a.projectId)) === k).length}</b>
                </button>
              ))}
            </div>
          )}
        </div>
        {focus === "projects" && (
        <div className="assign-list">
          {shown.map((a) => {
            const pr = plan.projects.find((x) => x.id === a.projectId)!;
            const h = hoursOf(a.id);
            return (
              <div key={a.id} className="assign-wrap">
              <button
                className={`assign-row ${a.status}`}
                onClick={() =>
                  open({ type: "cell", personId: p.id, projectId: pr.id })
                }
              >
                <i className={`dot-acc t-${accentOf(pr)}`} />
                <span className="assign-main">
                  <strong>{pr.name}</strong>
                  <small>
                    {[
                      isActivity(pr) ? kindLabels[kindOf(pr)] : pr.type,
                      pr.funder,
                      isActivity(pr) && pr.schedule ? scheduleSummary(pr.schedule, periodsOf(plan)) : yearsLabel(pr),
                    ]
                      .filter(Boolean)
                      .join(" · ") || projectStageLabel(pr)}
                  </small>
                  <AssignmentTasks plan={plan} a={a} />
                  {a.status !== "finished" && <NextMilestone project={pr} today={today} />}
                  <SharedLines plan={plan} a={a} />
                  {(a.notes || (track && noteOf(a.id))) && (
                    <small className="assign-note">
                      {[a.notes, track && noteOf(a.id) && `This week: ${noteOf(a.id)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  )}
                </span>
                <span className="assign-hours">
                  {!track ? "" : a.status === "finished"
                    ? ""
                    : !a.estimated
                      ? "Not estimated"
                      : `${fmt(h)} h this week`}
                </span>
                <span className={`pill s-${a.status}`}>
                  {a.status[0].toUpperCase() + a.status.slice(1)}
                </span>
              </button>
              <TaskItemsList plan={plan} a={a} />
              </div>
            );
          })}
          {!assignments.length && (
            <p className="muted pad">No projects assigned yet.</p>
          )}
        </div>
        )}
        {focus === "tasks" && <TasksFocus plan={plan} list={shown} open={open} patch={patch} />}
        {focus === "timeline" && (
          <div className="person-timeline">
            <ProjectTimeline
              plan={plan}
              list={shown.map((a) => plan.projects.find((x) => x.id === a.projectId)!).filter(Boolean)}
              open={open}
              exportTitle={`${p.name} timeline`}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Projects */

/** True while the window is narrower than `px` (the overview then opens as a dialog). */
function useNarrow(px = 900) {
  const q = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  React.useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia(q);
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, [q]);
  return narrow;
}

export function ProjectsView({
  plan,
  week,
  open,
  initialStage = "all",
  onAddTeam,
  onRemove,
}: {
  plan: Plan;
  week: string;
  open: Open;
  initialStage?: string;
  onAddTeam?: (projectId: string) => void;
  onRemove?: (assignmentId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const narrow = useNarrow();
  const pickedProject = picked ? plan.projects.find((x) => x.id === picked) : undefined;
  const panelOpen = !!pickedProject && !narrow;
  const select = narrow ? undefined : (id: string) => setPicked((cur) => (cur === id ? null : id));
  const panelRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    // New selection: start the panel at its top and bring that top into view.
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight - 120) window.scrollBy({ top: top - 16, behavior: "smooth" });
  }, [picked, panelOpen]);
  React.useEffect(() => {
    if (!panelOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) setPicked(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panelOpen]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [funder, setFunder] = useState("all");
  const [centre, setCentre] = useState("all");
  const [year, setYear] = useState("all");
  const [stage, setStage] = useState(initialStage);
  const [lead, setLead] = useState("all");
  const [layout, setLayout] = useLayout("tc-layout-projects");
  const [scope, setScopeState] = useState<"projects" | "activities" | "all">(
    () => {
      try {
        const v = localStorage.getItem("tc-projects-scope");
        if (v === "activities" || v === "all") return v;
      } catch {}
      return "projects";
    },
  );
  const setScope = (v: "projects" | "activities" | "all") => {
    setScopeState(v);
    try {
      localStorage.setItem("tc-projects-scope", v);
    } catch {}
  };
  const nProjects = plan.projects.filter((p) => !isActivity(p)).length;
  const nActivities = plan.projects.length - nProjects;

  const types = useMemo(() => typeFilterOptions(plan), [plan]);
  const funders = useMemo(() => funderOptions(plan), [plan]);
  const centres = useMemo(() => centreOptions(plan), [plan]);
  const stages = useMemo(() => stageDefs(plan), [plan]);
  const years = useMemo(() => {
    const ys = new Set<number>();
    plan.projects.forEach((p) => {
      if (p.startYear != null || p.endYear != null) {
        const a = p.startYear ?? p.endYear!,
          b = p.endYear ?? p.startYear!;
        for (let y = a; y <= b && y - a < 30; y++) ys.add(y);
      }
    });
    return [...ys].sort();
  }, [plan.projects]);

  const [sort, setSort] = useSort("tc-sort-projects", { by: "name", dir: "asc" });
  const inScope = plan.projects.filter((p) =>
    scope === "all" ? true : scope === "activities" ? isActivity(p) : !isActivity(p),
  );
  const list = inScope.filter((p) => {
    const team = plan.assignments.filter((a) => a.projectId === p.id);
    if (query && !`${p.name} ${p.abbreviation ?? ""} ${p.fullTitle ?? ""} ${p.funder ?? ""} ${p.centre ?? ""} ${p.description ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (type !== "all" && (type === "none" ? !!p.type : p.type !== type)) return false;
    if (funder !== "all" && p.funder !== funder) return false;
    if (centre !== "all" && (centre === "none" ? !!p.centre : p.centre !== centre)) return false;
    if (stage === "unstaffed" ? team.length > 0 || p.status === "finished" || p.status === "rejected" : stage !== "all" && stageKey(p) !== stage)
      return false;
    if (lead !== "all" && !team.some((a) => a.personId === lead)) return false;
    if (year !== "all") {
      const y = Number(year),
        a = p.startYear ?? p.endYear,
        b = p.endYear ?? p.startYear;
      if (a == null || b == null || y < a || y > b) return false;
    }
    return true;
  });
  const projectHours = (id: string) => {
    const ids = new Set(
      plan.assignments
        .filter((a) => a.projectId === id && a.status !== "finished")
        .map((a) => a.id),
    );
    return plan.allocations
      .filter((x) => x.week === week && ids.has(x.assignmentId))
      .reduce((t, x) => t + x.hours, 0);
  };
  const sorted = sortBy(
    list,
    (p) => {
      const team = plan.assignments.filter((a) => a.projectId === p.id);
      const active = team.filter((a) => a.status !== "finished");
      switch (sort.by) {
        case "stage": return stageOrder(plan, p);
        case "kind": return kinds.indexOf(kindOf(p));
        case "type": return isActivity(p) ? kindLabels[kindOf(p)] : p.type || null;
        case "funder": return p.funder || null;
        case "centre": return p.centre || null;
        case "start": return projectStart(p);
        case "end": return projectEnd(p);
        case "team": return team.length;
        case "hours": return projectHours(p.id);
        case "tasks": return projectTasks(plan, p.id).length;
        case "next": {
          if (p.status === "finished" || p.status === "rejected") return null;
          return milestonesOf(p).find((m) => !m.done)?.date ?? null;
        }
        case "estimates":
          return active.length ? active.filter((a) => a.estimated).length / active.length : null;
        default: return p.name;
      }
    },
    sort.dir,
    (p) => p.name,
  );
  const filtered =
    query || type !== "all" || funder !== "all" || centre !== "all" || year !== "all" || stage !== "all" || lead !== "all";

  return (
    <>
      <div className="scope-tabs" role="tablist" aria-label="Show">
        {(
          [
            ["projects", "Research projects", nProjects],
            ["activities", "Activities", nActivities],
            ["all", "All", plan.projects.length],
          ] as const
        ).map(([v, label, n]) => (
          <button
            key={v}
            role="tab"
            aria-selected={scope === v}
            className={scope === v ? "on" : ""}
            onClick={() => setScope(v)}
          >
            {label}
            <b>{n}</b>
          </button>
        ))}
        <span className="grow" />
        <SortControl
          sort={sort}
          onChange={setSort}
          options={[
            ["name", "Name"],
            ["stage", "Stage"],
            ["kind", "Kind"],
            ["type", "Type"],
            ["funder", "Funder"],
            ...((centres.length ? [["centre", "Research centre"]] : []) as [string, string][]),
            ["start", "Start date"],
            ["end", "End date"],
            ["team", "Team size"],
            ["next", "Next deadline or milestone"],
            ...((tracksCapacity(plan)
              ? [
                  ["hours", "Hours this week"],
                  ["estimates", "Estimates done"],
                ]
              : [["tasks", "Number of tasks"]]) as [string, string][]),
          ]}
        />
        <LayoutToggle value={layout} onChange={setLayout} timeline milestones />
        <button className="btn" onClick={() => open({ type: "project", kind: "teaching" })}>
          <Plus size={15} />
          New activity
        </button>
        <button className="btn" onClick={() => open({ type: "project" })}>
          <Plus size={15} />
          New project
        </button>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search projects"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Project type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
          <option value="none">Type not set</option>
        </select>
        <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="all">All stages</option>
          {stages
            .filter((d) => !d.hidden || plan.projects.some((p) => stageKey(p) === d.id))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          <option value="unstaffed">Unstaffed</option>
        </select>
        <select aria-label="Team member" value={lead} onChange={(e) => setLead(e.target.value)}>
          <option value="all">All team members</option>
          {plan.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select aria-label="Funder" value={funder} onChange={(e) => setFunder(e.target.value)}>
          <option value="all">All funders</option>
          {funders.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        {centres.length > 0 && (
          <select aria-label="Research centre" value={centre} onChange={(e) => setCentre(e.target.value)}>
            <option value="all">All centres</option>
            {centres.map((c) => (
              <option key={c} value={c}>
                {centreShort(c)}
              </option>
            ))}
            <option value="none">Not in a centre</option>
          </select>
        )}
        {filtered && (
          <span className="count">
            {list.length} of {inScope.length}
          </span>
        )}
        <span className="grow" />

      </div>

      {layout === "milestones" ? (
        <MilestonesView plan={plan} list={sorted} today={dateKey(new Date())} open={open} />
      ) : layout === "timeline" ? (
        <ProjectTimeline
          plan={plan}
          list={sorted}
          open={open}
          exportTitle={`${plan.profile?.abbreviation?.trim() || plan.profile?.fullName?.trim() || "Team"} projects`}
        />
      ) : layout === "list" ? (
        <ProjectTable plan={plan} list={sorted} week={week} open={open} sort={sort} onSort={setSort} />
      ) : (
        <div className={`proj-split${panelOpen ? " with-panel" : ""}`}>
          <div className={`card-grid${panelOpen ? " compact" : ""}`}>
            {sorted.map((p) => (
              <ProjectCard
                key={p.id}
                plan={plan}
                project={p}
                week={week}
                open={open}
                compact={panelOpen}
                selected={panelOpen && p.id === picked}
                onSelect={select}
              />
            ))}
          </div>
          {panelOpen && pickedProject && (
            <aside className="proj-panel" ref={panelRef} aria-label={`${pickedProject.name} overview`}>
              <div className="proj-panel-bar">
                <span className="eyebrow">{isActivity(pickedProject) ? "Activity overview" : "Project overview"}</span>
                <span className="proj-panel-actions">
                  <button type="button" className="btn primary" onClick={() => open({ type: "project", id: pickedProject.id })}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button type="button" className="icon-btn" aria-label="Close overview" title="Close (Esc)" onClick={() => setPicked(null)}>
                    <X size={18} />
                  </button>
                </span>
              </div>
              <ProjectDetail
                plan={plan}
                project={pickedProject}
                week={week}
                open={(m) => open({ ...m, back: undefined })}
                onAddTeam={() => onAddTeam?.(pickedProject.id)}
                onRemove={onRemove}
              />
            </aside>
          )}
        </div>
      )}
      {!list.length && (
        <p className="muted pad">
          {filtered
            ? "Nothing matches these filters."
            : scope === "activities"
              ? "No activities yet. Add teaching, supervision or networking with New activity."
              : "No projects yet."}
        </p>
      )}
    </>
  );
}

/** Tasks on a project with who does them, for cards and lists. */
function projectTasks(plan: Plan, projectId: string) {
  const lib = taskLibrary(plan);
  const by = new Map<string, string[]>();
  plan.assignments
    .filter((a) => a.projectId === projectId && a.status !== "finished")
    .forEach((a) => {
      const person = plan.people.find((x) => x.id === a.personId);
      (a.tasks ?? []).forEach((t) => {
        if (!by.has(t.taskId)) by.set(t.taskId, []);
        if (person) by.get(t.taskId)!.push(person.name);
      });
    });
  return lib.filter((t) => by.has(t.id)).map((t) => ({ task: t, people: by.get(t.id)! }));
}
function ProjectTaskList({ plan, projectId, max = 4 }: { plan: Plan; projectId: string; max?: number }) {
  const list = projectTasks(plan, projectId);
  if (!list.length) return <p className="pcard-tasks muted">No tasks yet. Add them when assigning people.</p>;
  return (
    <ul className="pcard-tasks">
      {list.slice(0, max).map(({ task, people }) => (
        <li key={task.id}>
          <TaskChip task={task} />
          <span className="who" title={people.join(", ")}>
            {people.map((n) => shortName(n)).join(", ")}
          </span>
        </li>
      ))}
      {list.length > max && <li className="muted">+{list.length - max} more tasks</li>}
    </ul>
  );
}

/** Shared work items a project takes part in, with partners and blockers. */
function ProjectShared({ plan, projectId, max = 2 }: { plan: Plan; projectId: string; max?: number }) {
  const items = workItemsOf(plan).filter(
    (w) => w.status !== "done" && workItemProjects(plan, w.id).includes(projectId),
  );
  if (!items.length) return null;
  return (
    <ul className="pcard-shared">
      {items.slice(0, max).map((w) => {
        const others = workItemProjects(plan, w.id)
          .filter((id) => id !== projectId)
          .map((id) => plan.projects.find((x) => x.id === id)?.name)
          .filter(Boolean) as string[];
        const wait = blockerLabels(plan, w);
        return (
          <li key={w.id}>
            <span className={`shared-badge ws-${w.status}`} title={w.note || undefined}>
              <Link2 size={12} />
              {w.name}
            </span>
            {others.length > 0 && (
              <span className="muted" title={others.join(", ")}>
                with {others.map(shortProject).join(", ")}
              </span>
            )}
            {wait.length > 0 && (
              <span className="waits" title={wait.join(", ")}>
                <Hourglass size={12} />
                waits on {wait.join(", ")}
              </span>
            )}
          </li>
        );
      })}
      {items.length > max && <li className="muted">+{items.length - max} more shared</li>}
    </ul>
  );
}

function ProjectCard({
  plan,
  project: p,
  week,
  open,
  compact = false,
  selected = false,
  onSelect,
}: {
  plan: Plan;
  project: Project;
  week: string;
  open: Open;
  /** Short tile while the overview panel is open. */
  compact?: boolean;
  selected?: boolean;
  /** Show this project in the overview panel instead of a dialog. */
  onSelect?: (id: string) => void;
}) {
  const show = () => (onSelect ? onSelect(p.id) : open({ type: "projectView", id: p.id }));
  const team = plan.assignments.filter((a) => a.projectId === p.id);
  const active = team.filter((a) => a.status !== "finished");
  const estimated = active.filter((a) => a.estimated).length;
  const unestimated = active.length - estimated;
  const hours = plan.allocations
    .filter((x) => x.week === week && active.some((a) => a.id === x.assignmentId))
    .reduce((s, x) => s + x.hours, 0);
  const acc = accentOf(p, false);
  const pct = active.length ? estimated / active.length : 0;
  const years = yearsLabel(p, true);
  const yearsTitle = yearsLabel(p);
  const text = p.description || p.notes;
  return (
    <article className={`pcard t-${acc}${compact ? " compact" : ""}${selected ? " selected" : ""}`}>
      <div className="pcard-top">
        {isActivity(p) ? (
          <span className={`tag t-${acc}`}>{kindLabels[kindOf(p)]}</span>
        ) : p.type ? (
          <span className={`tag t-${acc}`}>{p.type}</span>
        ) : (
          <span className="tag t-slate dim">No type</span>
        )}
        <span className={`state s-${p.status}`}>
          <i />
          {projectStageLabel(p)}
        </span>
      </div>
      <button className="pcard-name" onClick={show} title={p.fullTitle || p.name}>
        {projectLabel(p)}
      </button>
      {p.abbreviation?.trim() && p.abbreviation.trim() !== p.name && <p className="pcard-sub">{p.name}</p>}
      {rolesOf(plan, p).map((r) => (
        <p className="pcard-pi" key={r.role}>
          <Crown size={13} /> {r.short} <b>{r.name}</b>
        </p>
      ))}
      {(p.funder || p.centre) && <p className="pcard-funder">{[centreShort(p.centre), p.funder].filter(Boolean).join(" · ")}</p>}
      {isActivity(p) && p.schedule && (
        <p className="pcard-when">
          {p.schedule.mode === "recurring" ? <Repeat size={13} /> : <CalendarClock size={13} />}
          {scheduleSummary(p.schedule, periodsOf(plan))}
        </p>
      )}
      <MilestoneBadge project={p} today={dateKey(new Date())} />
      {!compact && (text ? <p className="pcard-text">{text}</p> : <span className="pcard-gap" />)}
      {!compact && <ProjectShared plan={plan} projectId={p.id} />}
      {compact ? null : !tracksCapacity(plan) ? (
        <ProjectTaskList plan={plan} projectId={p.id} />
      ) : (
      <div className="pcard-progress">
        <span>
          Estimates
          <b>
            {active.length ? `${estimated} of ${active.length}` : "–"}
          </b>
        </span>
        <div className="bar">
          <i
            className={unestimated ? "warn" : "ok"}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <span className="pcard-hours">
          {fmt(hours)} h this week
          {unestimated ? <em>{unestimated} open</em> : null}
        </span>
      </div>
      )}
      <footer className="pcard-foot">
        <span className="stack">
          {team.slice(0, 3).map((a) => {
            const person = plan.people.find((x) => x.id === a.personId)!;
            return (
              <span key={a.id} title={person.name}>
                <Ring name={person.name} tone={acc} size={24} />
              </span>
            );
          })}
          {team.length > 3 && <em className="stack-more" title={`${team.length} people`}>+{team.length - 3}</em>}
          {team.length === 0 && (
            <span className="meta" title="No one assigned">
              <Users size={13} />0
            </span>
          )}
        </span>
        {years && (
          <span className="meta" title={yearsTitle}>
            <CalendarDays size={13} />
            {years}
          </span>
        )}
        <button className="text-btn" onClick={show}>
          Details
          <ArrowUpRight size={13} />
        </button>
      </footer>
    </article>
  );
}

function ProjectTable({
  plan,
  list,
  week,
  open,
  sort,
  onSort,
}: {
  plan: Plan;
  list: Project[];
  week: string;
  open: Open;
  sort: SortState;
  onSort: (s: SortState) => void;
}) {
  if (!list.length) return null;
  const today = dateKey(new Date());
  return (
    <div className="card table-card list-card">
      <div className="scroll-table">
        <table className="list-table">
          <thead>
            <tr>
              <SortTh field="name" sort={sort} onChange={onSort}>Name</SortTh>
              <SortTh field="type" sort={sort} onChange={onSort}>Type</SortTh>
              <SortTh field="stage" sort={sort} onChange={onSort}>Stage</SortTh>
              <SortTh field="team" sort={sort} onChange={onSort}>Team</SortTh>
              <SortTh field="start" sort={sort} onChange={onSort}>Years</SortTh>
              <SortTh field="next" sort={sort} onChange={onSort}>Next deadline</SortTh>
              {tracksCapacity(plan) ? (
                <>
                  <SortTh field="hours" sort={sort} onChange={onSort} className="num">Hours this week</SortTh>
                  <SortTh field="estimates" sort={sort} onChange={onSort} className="num">Estimates</SortTh>
                </>
              ) : (
                <SortTh field="tasks" sort={sort} onChange={onSort}>Tasks</SortTh>
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const team = plan.assignments.filter((a) => a.projectId === p.id);
              const active = team.filter((a) => a.status !== "finished");
              const est = active.filter((a) => a.estimated).length;
              const hours = plan.allocations
                .filter((x) => x.week === week && active.some((a) => a.id === x.assignmentId))
                .reduce((s, x) => s + x.hours, 0);
              const acc = accentOf(p, false);
              const typeText = isActivity(p) ? kindLabels[kindOf(p)] : p.type;
              return (
                <tr key={p.id} className="click-row" onClick={() => open({ type: "projectView", id: p.id })}>
                  <th>
                    <span className="cell-project">
                      <i className={`dot-acc t-${acc}`} />
                      <span>
                        {p.name}
                        {(p.funder || rolesOf(plan, p).length > 0) && (
                          <small>{[p.funder, rolesText(plan, p)].filter(Boolean).join(" · ")}</small>
                        )}
                      </span>
                    </span>
                  </th>
                  <td>{typeText ? <span className={`tag t-${acc}`}>{typeText}</span> : <span className="muted">–</span>}</td>
                  <td>
                    <span className={`state s-${p.status}`}>
                      <i />
                      {projectStageLabel(p)}
                    </span>
                  </td>
                  <td>
                    <span className="stack">
                      {team.slice(0, 5).map((a) => {
                        const person = plan.people.find((x) => x.id === a.personId)!;
                        return (
                          <span key={a.id} title={person.name}>
                            <Ring name={person.name} tone={acc} size={24} />
                          </span>
                        );
                      })}
                      {team.length > 5 && <em>+{team.length - 5}</em>}
                    </span>
                  </td>
                  <td className="muted">{yearsLabel(p) || "–"}</td>
                  <td className="next-cell">
                    {(() => {
                      if (p.status === "finished" || p.status === "rejected") return <span className="muted">–</span>;
                      const open = milestonesOf(p).filter((m) => !m.done);
                      const m = open[0];
                      if (!m) return <span className="muted">–</span>;
                      const st = milestoneState(m, today);
                      const when = msWhen(m, today);
                      return (
                        <span className={`next-ms st-${st}`} title={m.note || undefined}>
                          <b>{msDay(m.date)}</b>
                          <small>
                            {m.title}
                            {when ? ` · ${when}` : ""}
                            {m.movedFrom ? ` · moved from ${msDay(m.movedFrom)}` : ""}
                            {open.length > 1 ? ` (+${open.length - 1})` : ""}
                          </small>
                        </span>
                      );
                    })()}
                  </td>
                  {tracksCapacity(plan) ? (
                    <>
                      <td className="num">{fmt(hours)} h</td>
                      <td className={`num ${active.length - est ? "c-orange" : ""}`}>
                        {active.length ? `${est} / ${active.length}` : "–"}
                      </td>
                    </>
                  ) : (
                    <td className="tasks-cell">
                      <span className="task-chips">
                        {projectTasks(plan, p.id).slice(0, 4).map(({ task, people }) => (
                          <TaskChip key={task.id} task={task} note={people.join(", ")} />
                        ))}
                        {!projectTasks(plan, p.id).length && <span className="muted">–</span>}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Analytics */

type Slice = { label: string; value: number; tone: string };

export function Donut({
  slices,
  size = 84,
  center,
  sub,
}: {
  slices: Slice[];
  size?: number;
  center?: React.ReactNode;
  sub?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 7,
    c = 2 * Math.PI * r,
    gap = total > 0 && slices.filter((x) => x.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <span className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={slices.map((x) => `${x.label} ${x.value}`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} className="donut-track" />
        {total > 0 &&
          slices
            .filter((x) => x.value > 0)
            .map((x) => {
              const len = (x.value / total) * c;
              const el = (
                <circle
                  key={x.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  className={`donut-seg t-${x.tone}`}
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${x.label}: ${x.value}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
      </svg>
      {center != null && (
        <span className="donut-center">
          <b>{center}</b>
          {sub && <small>{sub}</small>}
        </span>
      )}
    </span>
  );
}

function Legend({ slices, onPick }: { slices: Slice[]; onPick?: (label: string) => void }) {
  return (
    <ul className="kpi-legend">
      {slices
        .filter((x) => x.value > 0)
        .map((x) => (
          <li key={x.label}>
            <button type="button" onClick={onPick ? () => onPick(x.label) : undefined} disabled={!onPick}>
              <i className={`t-${x.tone}`} />
              {x.label}
              <b>{x.value}</b>
            </button>
          </li>
        ))}
    </ul>
  );
}

const STAGE_TONE: Record<ProjectStatus, string> = {
  ongoing: "green",
  planned: "amber",
  proposal: "violet",
  submitted: "blue",
  granted: "teal",
  finished: "slate",
  rejected: "red",
  unspecified: "free",
};

export function AnalyticsCards({
  plan,
  week,
  onStage,
  onTeam,
}: {
  plan: Plan;
  week: string;
  onStage: (stage: string) => void;
  onTeam: () => void;
}) {
  const track = tracksCapacity(plan);
  const research = plan.projects.filter((p) => !isActivity(p));
  const statusSlices: Slice[] = [
    ...personStatuses.map((st) => ({
      label: personStatusLabels[st],
      value: plan.people.filter((p) => p.status === st).length,
      tone: STATUS_TONE[st],
    })),
    { label: "Not set", value: plan.people.filter((p) => !p.status).length, tone: "slate" },
  ];
  const loads = plan.people.map((p) => personLoad(plan, p.id, week));
  const band = (pred: (l: (typeof loads)[number]) => boolean) => loads.filter(pred).length;
  const teamSlices: Slice[] = [
    { label: "Over capacity", value: band((l) => l.over), tone: "red" },
    { label: "Busy (85%+)", value: band((l) => !l.over && l.capacity != null && (l.utilisation ?? 0) >= 0.85), tone: "orange" },
    { label: "Balanced", value: band((l) => !l.over && l.capacity != null && (l.utilisation ?? 0) >= 0.5 && (l.utilisation ?? 0) < 0.85), tone: "green" },
    { label: "Light (<50%)", value: band((l) => !l.over && l.capacity != null && (l.utilisation ?? 0) < 0.5), tone: "blue" },
    { label: "Capacity not set", value: band((l) => l.capacity == null), tone: "slate" },
  ];
  const stageSlices: Slice[] = stageDefs(plan)
    .map((d) => ({
      label: d.label,
      value: research.filter((p) => stageKey(p) === d.id).length,
      tone: STAGE_TONE[(d.like ?? d.id) as ProjectStatus],
      id: d.id,
    }))
    .filter((x) => x.value > 0 || !x.id.startsWith("s-"));
  const c = assignmentCounts(plan);
  const asgSlices: Slice[] = [
    { label: "Ongoing", value: c.ongoing, tone: "blue" },
    { label: "Planned", value: c.planned, tone: "amber" },
    { label: "Finished", value: c.finished, tone: "slate" },
  ];
  const active = plan.assignments.filter((a) => a.status !== "finished");
  const est = active.filter((a) => a.estimated).length;
  const estSlices: Slice[] = [
    { label: "Estimated", value: est, tone: "green" },
    { label: "Not estimated", value: active.length - est, tone: "orange" },
  ];
  const activeProjects = research.filter((p) => p.status === "ongoing" || p.status === "planned" || p.status === "granted").length;
  const pct = active.length ? Math.round((est / active.length) * 100) : 100;
  const withTasks = active.filter((a) => a.tasks?.length).length;
  const taskPct = active.length ? Math.round((withTasks / active.length) * 100) : 100;
  const taskSlices: Slice[] = [
    { label: "With tasks", value: withTasks, tone: "violet" },
    { label: "No tasks yet", value: active.length - withTasks, tone: "slate" },
  ];
  const stageByLabel = Object.fromEntries(stageDefs(plan).map((d) => [d.label, d.id]));
  // v36: one plain sentence per card, read before the numbers.
  const byStatus = (st: string) => plan.people.filter((p) => p.status === st).length;
  const teamLine = track
    ? loadTakeaway(band((l) => l.over), band((l) => l.capacity == null), plan.people.length)
    : teamTakeaway({ full: byStatus("full"), steady: byStatus("steady"), room: byStatus("room"), notSet: plan.people.filter((p) => !p.status).length, total: plan.people.length });
  const stageCounts: Record<string, number> = {};
  for (const d of stageDefs(plan)) {
    const k = d.like ?? d.id;
    stageCounts[k] = (stageCounts[k] ?? 0) + research.filter((p) => stageKey(p) === d.id).length;
  }

  return (
    <section className="kpi-grid">
      <div className="kpi t-blue">
        <p className="kpi-takeaway">{teamLine}</p>
        <div className="kpi-text">
          <span className="kpi-label">Team</span>
          <b className="kpi-value">{plan.people.length}</b>
          <span className="kpi-note">{track ? "load this week" : "how full their plate is"}</span>
          <Legend slices={track ? teamSlices : statusSlices} onPick={onTeam} />
        </div>
        <Donut slices={track ? teamSlices : statusSlices} />
      </div>
      <div className="kpi t-violet">
        <p className="kpi-takeaway">{projectsTakeaway(stageCounts, research.length)}</p>
        <div className="kpi-text">
          <span className="kpi-label">Projects</span>
          <b className="kpi-value">{research.length}</b>
          <span className="kpi-note">{activeProjects} active or granted</span>
          <Legend slices={stageSlices} onPick={(l) => onStage(stageByLabel[l] ?? "all")} />
        </div>
        <Donut slices={stageSlices} />
      </div>
      <div className="kpi t-green">
        <p className="kpi-takeaway">{assignmentsTakeaway(c)}</p>
        <div className="kpi-text">
          <span className="kpi-label">Assignments</span>
          <b className="kpi-value">{c.active}</b>
          <span className="kpi-note">active of {c.total}</span>
          <Legend slices={asgSlices} />
        </div>
        <Donut slices={asgSlices} />
      </div>
      {!track ? (
        <div className="kpi t-violet">
          <p className="kpi-takeaway">{tasksTakeaway(active.length - withTasks, active.length)}</p>
          <div className="kpi-text">
            <span className="kpi-label">Tasks</span>
            <b className="kpi-value">{taskPct}%</b>
            <span className="kpi-note">of active assignments have tasks</span>
            <Legend slices={taskSlices} />
          </div>
          <Donut slices={taskSlices} center={`${taskPct}%`} />
        </div>
      ) : (
      <div className={`kpi ${est < active.length ? "t-orange" : "t-green"}`}>
        <p className="kpi-takeaway">{estimatesTakeaway(active.length - est, active.length)}</p>
        <div className="kpi-text">
          <span className="kpi-label">Estimates</span>
          <b className="kpi-value">{pct}%</b>
          <span className="kpi-note">of active assignments have hours</span>
          <Legend slices={estSlices} />
        </div>
        <Donut slices={estSlices} center={`${pct}%`} />
      </div>
      )}
    </section>
  );
}

/** Which tasks the team is working on, and by whom. */
export function TasksOverviewCard({ plan, onPerson }: { plan: Plan; onPerson?: () => void }) {
  const lib = taskLibrary(plan);
  const rows = lib
    .map((t) => {
      const people = new Set<string>();
      const projects = new Set<string>();
      plan.assignments
        .filter((a) => a.status !== "finished" && a.tasks?.some((x) => x.taskId === t.id))
        .forEach((a) => {
          people.add(a.personId);
          projects.add(a.projectId);
        });
      return { t, people: [...people], projects: projects.size };
    })
    .filter((r) => r.people.length)
    .sort((a, b) => b.people.length - a.people.length);
  const max = Math.max(1, ...rows.map((r) => r.people.length));
  return (
    <section className="card tasks-card">
      <div className="card-heading">
        <div>
          <h2>What the team works on</h2>
          {rows.length > 0 && (
            <p className="chart-takeaway">
              {rows[0].t.name} involves the most people ({rows[0].people.length} on {rows[0].projects}{" "}
              {rows[0].projects === 1 ? "project" : "projects"}).
            </p>
          )}
          <p>Tasks on active assignments, by number of people</p>
        </div>
      </div>
      {rows.length ? (
        <div className="hbars">
          {rows.map(({ t, people, projects }) => (
            <button key={t.id} className="hbar" onClick={onPerson}>
              <span className="hbar-name">
                <TaskChip task={t} />
              </span>
              <span className="hbar-track">
                <i className={`t-${t.color || "slate"}`} style={{ width: `${(people.length / max) * 100}%` }} />
              </span>
              <b title={people.map((id) => plan.people.find((p) => p.id === id)?.name).join(", ")}>
                {people.length} {people.length === 1 ? "person" : "people"} · {projects}{" "}
                {projects === 1 ? "project" : "projects"}
              </b>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted pad-x">
          No tasks yet. Add tasks such as Measurement or Data analysis when you
          assign people to projects.
        </p>
      )}
    </section>
  );
}

export function OutlookCard({
  plan,
  week,
  weeks,
  addWeeks,
  label,
}: {
  plan: Plan;
  week: string;
  weeks: number;
  addWeeks: (w: string, n: number) => string;
  label: (w: string) => string;
}) {
  const rows = Array.from({ length: weeks }, (_, i) => {
    const w = addWeeks(week, i);
    let committed = 0,
      tentative = 0,
      capacity = 0,
      known = 0;
    for (const p of plan.people) {
      const l = personLoad(plan, p.id, w);
      committed += l.committed;
      tentative += l.tentative;
      if (l.capacity != null) {
        capacity += l.capacity;
        known++;
      }
    }
    return { w, committed, tentative, capacity, known };
  });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.committed + r.tentative, r.capacity)));
  const anyCap = rows.some((r) => r.known > 0);
  const anyHours = rows.some((r) => r.committed + r.tentative > 0);
  const H = 120;
  return (
    <section className="card outlook-card">
      <div className="card-heading">
        <div>
          <h2>Capacity outlook</h2>
          <p>Planned project hours for the next {weeks} weeks against available capacity</p>
        </div>
      </div>
      {!anyHours && !anyCap ? (
        <p className="muted pad-x">Set capacity and plan hours to see the coming weeks.</p>
      ) : (
        <div className="outlook" style={{ height: H + 34 }}>
          {rows.map((r) => {
            const c = (r.committed / max) * H,
              t = (r.tentative / max) * H,
              cap = (r.capacity / max) * H,
              over = r.known > 0 && r.committed + r.tentative > r.capacity;
            return (
              <div key={r.w} className={`ol-col ${over ? "over" : ""}`} title={`${label(r.w)}: ${fmt(r.committed)} h committed, ${fmt(r.tentative)} h tentative${r.known ? `, ${fmt(r.capacity)} h available` : ""}`}>
                <div className="ol-bars" style={{ height: H }}>
                  {r.known > 0 && <span className="ol-cap" style={{ bottom: cap }} />}
                  <i className="ol-t" style={{ height: t }} />
                  <i className="ol-c" style={{ height: c }} />
                </div>
                <small>{label(r.w)}</small>
              </div>
            );
          })}
        </div>
      )}
      <div className="card-footer">
        <span className="ol-legend">
          <i className="ol-c" /> Committed <i className="ol-t" /> Tentative <i className="ol-capkey" /> Capacity
        </span>
        <span>{anyCap ? `${rows[0].known} of ${plan.people.length} with capacity` : "No capacity set yet"}</span>
      </div>
    </section>
  );
}

export function HoursByProjectCard({ plan, week, open }: { plan: Plan; week: string; open: Open }) {
  const rows = plan.projects
    .map((p) => {
      const ids = new Set(
        plan.assignments.filter((a) => a.projectId === p.id && a.status !== "finished").map((a) => a.id),
      );
      const hours = tracksCapacity(plan)
        ? plan.allocations
            .filter((x) => x.week === week && ids.has(x.assignmentId))
            .reduce((s, x) => s + x.hours, 0)
        : ids.size;
      return { p, hours };
    })
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.hours));
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const byKind = kinds
    .map((k) => ({
      k,
      h: rows.filter((r) => kindOf(r.p) === k).reduce((t, r) => t + r.hours, 0),
    }))
    .filter((x) => x.h > 0);
  return (
    <section className="card byproject-card">
      <div className="card-heading">
        <div>
          <h2>{tracksCapacity(plan) ? "Where the time goes" : "Where the work goes"}</h2>
          {total > 0 && (
            <p className="chart-takeaway">
              {largestTakeaway(
                rows.map((r) => ({ label: projectLabel(r.p), value: r.hours })),
                (v) => (tracksCapacity(plan) ? `${fmt(v)} h` : `${v} ${v === 1 ? "person" : "people"}`),
              )}
            </p>
          )}
          <p>
            {!tracksCapacity(plan)
              ? `${fmt(total)} active assignments`
              : total
                ? `${fmt(total)} h planned this week`
                : "Selected week"}
          </p>
        </div>
      </div>
      {total > 0 && (
        <div className="kind-mix">
          <div className="seg-bar" role="img" aria-label="Hours by kind this week">
            {byKind.map((x) => (
              <i
                key={x.k}
                className={`t-${KIND_ACC[x.k]}`}
                style={{ width: `${(x.h / total) * 100}%` }}
                title={`${kindLabels[x.k]}: ${fmt(x.h)} h`}
              />
            ))}
          </div>
          <div className="kind-split">
            {byKind.map((x) => (
              <span key={x.k} className={`t-${KIND_ACC[x.k]}`}>
                <i />
                {x.k === "project" ? "Research projects" : kindLabels[x.k]}
                <b>{Math.round((x.h / total) * 100)}%</b>
              </span>
            ))}
          </div>
        </div>
      )}
      {top.length ? (
        <div className="hbars">
          {top.map(({ p, hours }) => (
            <button key={p.id} className="hbar" onClick={() => open({ type: "projectView", id: p.id })}>
              <span className="hbar-name">{p.name}</span>
              <span className="hbar-track">
                <i className={`t-${accentOf(p)}`} style={{ width: `${(hours / max) * 100}%` }} />
              </span>
              <b>{tracksCapacity(plan) ? `${fmt(hours)} h` : `${hours} ${hours === 1 ? "person" : "people"}`}</b>
            </button>
          ))}
          {rows.length > top.length && <p className="muted pad-x">+{rows.length - top.length} more</p>}
        </div>
      ) : (
        <p className="muted pad-x">No hours planned for this week yet.</p>
      )}
    </section>
  );
}

/** Shared work across projects: who does which part, and what waits on what. */
export function SharedWorkView({
  plan,
  open,
  patch,
}: {
  plan: Plan;
  open: Open;
  patch: (fn: (p: Plan) => void, message?: string) => void;
}) {
  const items = workItemsOf(plan);
  const lib = taskLibrary(plan);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"open" | "all">("open");
  const [mode, setModeState] = useState<"cards" | "map">(() => {
    try {
      return localStorage.getItem("tc-shared-view") === "map" ? "map" : "cards";
    } catch {
      return "cards";
    }
  });
  const setMode = (m: "cards" | "map") => {
    setModeState(m);
    try {
      localStorage.setItem("tc-shared-view", m);
    } catch {
      /* private window */
    }
  };
  const [focusId, setFocusId] = useState<string | null>(null);
  const showOnMap = (id: string) => {
    setFocusId(id);
    setMode("map");
  };
  const order = { active: 0, planned: 1, done: 2 } as const;
  const list = items
    .filter((w) => show === "all" || w.status !== "done")
    .filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  const waiting = items.filter((w) => w.status !== "done" && blockerLabels(plan, w).length).length;
  return (
    <>
      <div className="scope-tabs" role="tablist" aria-label="Show">
        {(
          [
            ["open", "Open", items.filter((w) => w.status !== "done").length],
            ["all", "All", items.length],
          ] as const
        ).map(([v, label, n]) => (
          <button
            key={v}
            role="tab"
            aria-selected={show === v}
            className={show === v ? "on" : ""}
            onClick={() => setShow(v)}
          >
            {label}
            <b>{n}</b>
          </button>
        ))}
        <span className="grow" />
        <div className="segmented sw-toggle" role="group" aria-label="View">
          <button className={mode === "cards" ? "selected" : ""} aria-pressed={mode === "cards"} onClick={() => setMode("cards")}>
            <LayoutGrid size={15} />
            Cards
          </button>
          <button className={mode === "map" ? "selected" : ""} aria-pressed={mode === "map"} onClick={() => setMode("map")}>
            <Network size={15} />
            Map
          </button>
        </div>
        {waiting > 0 && (
          <span className="waits">
            <Hourglass size={13} />
            {waiting} waiting on other work
          </span>
        )}
        <button className="btn" onClick={() => open({ type: "workitem" })}>
          <Plus size={15} />
          New shared work
        </button>
      </div>
      {mode === "map" ? (
        <DependencyMap
          plan={plan}
          includeDone={show === "all"}
          focusId={focusId}
          setFocusId={setFocusId}
          patch={patch}
          open={open}
        />
      ) : (
      <>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={16} />
          <input aria-label="Search shared work" placeholder="Search shared work…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {!items.length ? (
        <div className="card empty-shared">
          <Link2 size={22} />
          <h2>No shared work yet</h2>
          <p>
            Shared work is something several projects build on, like a test piece batch that one project
            machines and another measures. Create one here and pick the projects and the task each one does,
            or link a task when you assign someone. It can wait on other shared work, a project or a task.
          </p>
          <button className="btn primary" onClick={() => open({ type: "workitem" })}>
            <Plus size={15} />
            New shared work
          </button>
        </div>
      ) : (
        <div className="wi-grid">
          {list.map((w) => {
            const parts = workItemParts(plan, w.id);
            const projects = workItemProjects(plan, w.id);
            const wait = [
              ...((w.waitsOn ?? [])
                .map((id) => items.find((x) => x.id === id))
                .filter(Boolean) as WorkItem[]).map((x) => ({ key: x.id, name: x.name, done: x.status === "done" })),
              ...(w.waitsOnProjects ?? []).map((r) => ({
                key: `${r.projectId}:${r.taskId ?? ""}`,
                name: refLabel(plan, r),
                done: refDone(plan, r),
              })),
            ];
            const needed = dependentsOf(plan, w.id);
            return (
              <article key={w.id} className={`pcard wi-card ws-${w.status}`}>
                <div className="pcard-top">
                  <span className={`ws-pill ws-${w.status}`}>
                    <i />
                    {workStatusLabels[w.status]}
                  </span>
                  <span className="pcard-tools">
                    <button className="icon-btn" aria-label={`Show ${w.name} on the map`} title="Show on map" onClick={() => showOnMap(w.id)}>
                      <Network size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${w.name}`}
                      onClick={() => open({ type: "workitem", id: w.id })}
                    >
                      <Pencil size={14} />
                    </button>
                  </span>
                </div>
                <button className="pcard-name" onClick={() => open({ type: "workitem", id: w.id })}>
                  {w.name}
                </button>
                {w.note && <p className="pcard-text">{w.note}</p>}
                <ul className="wi-parts">
                  {projects.map((pid) => {
                    const pr = plan.projects.find((x) => x.id === pid)!;
                    const here = parts.filter((u) => u.projectId === pid);
                    const tasks = lib.filter((t) => here.some((u) => u.taskId === t.id));
                    const people = [
                      ...new Set(
                        here
                          .map((u) => plan.people.find((x) => x.id === u.personId)?.name)
                          .filter(Boolean) as string[],
                      ),
                    ];
                    return (
                      <li key={pid}>
                        <button
                          className="wi-project"
                          onClick={() => open({ type: "projectView", id: pid })}
                        >
                          <i className={`dot-acc t-${accentOf(pr)}`} />
                          {pr.name}
                        </button>
                        <span className="task-chips">
                          {tasks.map((t) => (
                            <TaskChip
                              key={t.id}
                              task={t}
                              note={here.find((u) => u.taskId === t.id)?.note}
                            />
                          ))}
                        </span>
                        <span className="who">
                          {people.length ? people.map(shortName).join(", ") : <em className="muted">No one yet</em>}
                        </span>
                      </li>
                    );
                  })}
                  {!projects.length && (
                    <li className="muted">
                      No project linked yet. Edit to pick projects and tasks.
                    </li>
                  )}
                </ul>
                {(wait.length > 0 || needed.length > 0) && (
                  <div className="wi-deps">
                    {wait.length > 0 && (
                      <span>
                        <Hourglass size={12} />
                        Waits on{" "}
                        {wait.map((x, i) => (
                          <React.Fragment key={x.key}>
                            {i > 0 && ", "}
                            <b className={x.done ? "done" : ""}>{x.name}</b>
                            {x.done && " (done)"}
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                    {needed.length > 0 && (
                      <span className="muted">
                        Needed by {needed.map((x) => x.name).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {!list.length && <p className="muted">Nothing matches.</p>}
        </div>
      )}
      </>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Timeline */

const SEG_TITLE: Record<string, string> = {
  prep: "Application preparation",
  wait: "Waiting for decision",
  proposed: "Proposed period (tentative)",
  active: "Contract period",
  extension: "Extension",
  recurring: "Recurring",
  event: "Event",
};
const dayNum = (d: string) => Math.round(parseDate(d).getTime() / 86400000);
/** One line per project: application, proposed period, contract period and extensions. */
export function ProjectTimeline({
  plan,
  list,
  open,
  exportTitle,
}: {
  plan: Plan;
  list: Project[];
  open: Open;
  /** When set, shows "Export to Markwhen" for the projects in the list. */
  exportTitle?: string;
}) {
  const exportMw = () => {
    const name = (exportTitle ?? "timeline").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-").toLowerCase();
    download(plansToMarkwhen(plan, list, { title: exportTitle }), `${name || "timeline"}.mw`, "text/markdown;charset=utf-8");
  };
  const today = dateKey(new Date());
  const rows = list.map((p) => {
    let seg = projectSegments(p, periodsOf(plan));
    const fin = p.status === "finished" ? p.dates?.finishedOn : undefined;
    if (fin)
      seg = seg
        .filter((x) => x.from <= fin)
        .map((x) => (x.to > fin ? { ...x, to: fin, cut: true } : x));
    return { p, seg, fin, ms: milestonesOf(p) };
  });
  const all = rows.flatMap((r) => [...r.seg.flatMap((x) => [x.from, x.to]), ...r.ms.map((m) => m.date)]);
  if (!all.length)
    return (
      <div className="card empty-shared">
        <GanttChart size={22} />
        <h2>No dates yet</h2>
        <p>
          Open a project and add its dates: application, proposed period, contract period and any
          extensions. Projects with only years show as approximate bars.
        </p>
      </div>
    );
  const y0 = Math.min(Number(all.reduce((a, b) => (a < b ? a : b)).slice(0, 4)), Number(today.slice(0, 4)));
  const y1 = Math.max(Number(all.reduce((a, b) => (a > b ? a : b)).slice(0, 4)), Number(today.slice(0, 4)));
  const d0 = dayNum(`${y0}-01-01`),
    d1 = dayNum(`${y1 + 1}-01-01`);
  const pos = (d: string) => ((dayNum(d) - d0) / (d1 - d0)) * 100;
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const minWidth = Math.max(720, years.length * 150);
  const undated = rows.filter((r) => !r.seg.length && !r.ms.length);
  const hasActivities = rows.some((r) => r.seg.length && isActivity(r.p));
  const hasMs = rows.some((r) => r.ms.some((m) => m.kind === "milestone")),
    hasDl = rows.some((r) => r.ms.some((m) => m.kind === "deadline"));
  return (
    <section className="card timeline-card">
      <div className="tl-legend" aria-label="Legend">
        <span><i className="tl-key prep" />Application writing</span>
        <span><i className="tl-key submit" />Submitted</span>
        <span><i className="tl-key wait" />Waiting for decision</span>
        <span><i className="tl-key decision" />Decision</span>
        <span><i className="tl-key proposed" />Proposed period</span>
        <span><i className="tl-key active" />Ongoing (contract)</span>
        <span><i className="tl-key extension" />Extension</span>
        <span><i className="tl-key approx" />Years only</span>
        {hasActivities && (
          <>
            <span><i className="tl-key recurring" />Recurring</span>
            <span><i className="tl-key event" />Meeting or event</span>
          </>
        )}
        {hasMs && <span><i className="tl-key pt-ms" />Milestone</span>}
        {hasDl && <span><i className="tl-key pt-dl" />Deadline</span>}
        <span><i className="tl-key finished" />Finished or rejected</span>
        <span><i className="tl-key today" />Today</span>
      </div>
      <div className="tl-foot">
        <p className="tl-hint">Each line keeps its project's colour; the pattern shows the stage. Hover a bar for exact dates.</p>
        {exportTitle && (
          <button
            type="button"
            className={`btn small ${NO_EXPORT}`}
            onClick={exportMw}
            title="Download a Markwhen text file (.mw) of this timeline, for markwhen.com, Meridiem or the VS Code extension"
          >
            <Download size={14} />
            Export to Markwhen
          </button>
        )}
      </div>
      <div className="tl-scroll">
        <div className="tl" style={{ minWidth }}>
          <div className="tl-row tl-axis">
            <div className="tl-name" />
            <div className="tl-track">
              {years.map((y) => (
                <span key={y} className="tl-year" style={{ left: `${pos(`${y}-01-01`)}%`, width: `${100 / years.length}%` }}>
                  {y}
                  {[4, 7, 10].map((m) => (
                    <i key={m} style={{ left: `${((m - 1) / 12) * 100}%` }} />
                  ))}
                </span>
              ))}
              <span className="tl-today-label" style={{ left: `${pos(today)}%` }}>Today</span>
            </div>
          </div>
          {rows
            .filter((r) => r.seg.length || r.ms.length)
            .map(({ p, seg, fin, ms }) => {
              const acc = accentOf(p, false);
              const grey = p.status === "finished" || p.status === "rejected";
              const d = p.dates ?? {};
              return (
                <div key={p.id} className={`tl-row ${grey ? "grey" : ""} t-${acc}`}>
                  <button className="tl-name" title={p.fullTitle || p.name} onClick={() => open({ type: "projectView", id: p.id })}>
                    <strong>{projectLabel(p)}</strong>
                    <span className={`state s-${p.status}`}>
                      <i />
                      {projectStageLabel(p)}
                      {(() => {
                        const last = seg.reduce((m, x) => (x.to > m.to ? x : m), seg[0]);
                        if (!last) return "";
                        if (isActivity(p)) return p.schedule ? ` · ${scheduleSummary(p.schedule, periodsOf(plan))}` : "";
                        const ext = p.extensions?.length ? ` (extended${p.extensions.length > 1 ? ` ×${p.extensions.length}` : ""})` : "";
                        return grey ? "" : ` · to ${monthLabel(last.to)}${ext}`;
                      })()}
                    </span>
                  </button>
                  <div className="tl-track">
                    {years.map((y) => (
                      <i key={y} className="tl-grid" style={{ left: `${pos(`${y}-01-01`)}%` }} />
                    ))}
                    {years.flatMap((y) =>
                      [4, 7, 10].map((m) => (
                        <i key={`${y}-${m}`} className="tl-grid q" style={{ left: `${pos(`${y}-${String(m).padStart(2, "0")}-01`)}%` }} />
                      )),
                    )}
                    {seg.map((x, i) => {
                      const left = pos(x.from),
                        w = Math.max(pos(x.to) - left, 0.35);
                      const title = `${x.kind === "extension" || x.kind === "recurring" || x.kind === "event" || isActivity(p) ? x.label : SEG_TITLE[x.kind]}${x.approx ? " (years only)" : ""}: ${dayLabel(x.from)} to ${dayLabel(x.to)}${x.note ? `\n${x.note}` : ""}`;
                      return (
                        <span
                          key={i}
                          className={`tl-seg ${x.kind} ${x.approx ? "approx" : ""}`}
                          style={{ left: `${left}%`, width: `${w}%` }}
                          title={title}
                        >
                          {x.kind === "extension" && w > 2.5 && <em>+{Math.round((dayNum(x.to) - dayNum(x.from)) / 30.4)} mo</em>}
                        </span>
                      );
                    })}
                    {d.appDue && (
                      <span className="tl-mark submit" style={{ left: `${pos(d.appDue)}%` }} title={`Submission: ${dayLabel(d.appDue)}`} />
                    )}
                    {d.decisionOn && (
                      <span className="tl-mark decision" style={{ left: `${pos(d.decisionOn)}%` }} title={`Decision: ${dayLabel(d.decisionOn)}`} />
                    )}
                    {fin && <span className="tl-mark fin" style={{ left: `${pos(fin)}%` }} title={`Finished: ${dayLabel(fin)}`} />}
                    {ms.map((m) => {
                      const when = msWhen(m, today);
                      return (
                        <span
                          key={m.id}
                          className={`tl-pt pt-${m.kind === "deadline" ? "dl" : "ms"} st-${milestoneState(m, today)}`}
                          style={{ left: `${pos(m.date)}%` }}
                          title={`${milestoneKindLabels[m.kind]}: ${m.title}\n${dayLabel(m.date)}${when ? ` · ${when}` : ""}${m.movedFrom ? `\n${movedText(m, dayLabel)}` : ""}${m.note ? `\n${m.note}` : ""}`}
                        />
                      );
                    })}
                    <i className="tl-today" style={{ left: `${pos(today)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      {undated.length > 0 && (
        <p className="tl-undated">
          No dates yet:{" "}
          {undated.map((r, i) => (
            <React.Fragment key={r.p.id}>
              {i > 0 && ", "}
              <button className="text-btn" onClick={() => open({ type: "projectView", id: r.p.id })}>
                {projectLabel(r.p)}
              </button>
            </React.Fragment>
          ))}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------ Schedule editor */

/** Date and time entry that fits the activity kind. */
export function ScheduleEditor({
  kind,
  value,
  onChange,
  periods,
  onOpenSettings,
}: {
  kind: Kind;
  value: Schedule | undefined;
  onChange: (s: Schedule | undefined) => void;
  periods: TeachingPeriod[];
  onOpenSettings?: () => void;
}) {
  const modes = MODES_FOR[kind];
  if (!modes.length) return null;
  const sc: Schedule = value && modes.includes(value.mode) ? value : { mode: modes[0] };
  const set = (patch: Partial<Schedule>) => {
    const next: Schedule = { ...sc, ...patch };
    (Object.keys(next) as (keyof Schedule)[]).forEach((k) => {
      const v = next[k];
      if (v === "" || v === undefined || (Array.isArray(v) && !v.length)) delete next[k];
    });
    onChange(next);
  };
  const mode = (m: ScheduleMode) =>
    onChange(m === "recurring" ? { mode: m, freq: "weekly", start: sc.start, from: sc.from, to: sc.to } : { mode: m, start: sc.start, end: m === "once" ? undefined : sc.end, from: sc.from, to: sc.to });
  const date = (k: "start" | "end", label: string) => (
    <label>
      {label}
      <input type="date" value={sc[k] ?? ""} onChange={(e) => set({ [k]: e.target.value || undefined })} />
    </label>
  );
  const time = (k: "from" | "to", label: string) => (
    <label>
      {label}
      <input type="time" step={300} value={sc[k] ?? ""} onChange={(e) => set({ [k]: e.target.value || undefined })} />
    </label>
  );
  const days = (
    <div className="day-chips" role="group" aria-label="Weekdays">
      {WEEKDAYS.map((d, i) => {
        const on = !!sc.weekdays?.includes(i);
        return (
          <button
            type="button"
            key={d}
            className={`task-chip pick day-chip t-blue ${on ? "on" : ""}`}
            aria-pressed={on}
            onClick={() =>
              set({ weekdays: on ? sc.weekdays!.filter((x) => x !== i) : [...(sc.weekdays ?? []), i].sort() })
            }
          >
            {d}
          </button>
        );
      })}
    </div>
  );
  const summary = scheduleSummary(value && modes.includes(value.mode) ? value : undefined, periods);
  return (
    <div className="sched">
      <h3>When</h3>
      {modes.length > 1 && (
        <div className="sched-modes" role="radiogroup" aria-label="Kind of date">
          {modes.map((m) => (
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={sc.mode === m}
              className={`task-chip pick t-blue ${sc.mode === m ? "on" : ""}`}
              onClick={() => mode(m)}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      )}
      {sc.mode === "periods" && (
        <>
          {periods.length ? (
            <div className="day-chips" role="group" aria-label="Teaching periods">
              {periods.map((p) => {
                const on = !!sc.periodIds?.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`task-chip pick t-violet ${on ? "on" : ""}`}
                    aria-pressed={on}
                    title={`${p.start} to ${p.end}`}
                    onClick={() =>
                      set({ periodIds: on ? sc.periodIds!.filter((x) => x !== p.id) : [...(sc.periodIds ?? []), p.id] })
                    }
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="field-hint">
              No teaching periods yet.{" "}
              {onOpenSettings && (
                <button type="button" className="text-btn" onClick={onOpenSettings}>
                  Add them in Settings
                </button>
              )}
            </p>
          )}
          <label className="check-line">
            <input
              type="checkbox"
              checked={!!sc.variableDays}
              onChange={(e) => set({ variableDays: e.target.checked || undefined, weekdays: e.target.checked ? undefined : sc.weekdays })}
            />
            Variable days (teaching falls on different days from week to week)
          </label>
          {!sc.variableDays && (
            <>
              <span className="field-hint">Weekly teaching days (optional)</span>
              {days}
            </>
          )}
          <div className="sched-grid">
            <label>
              Hours per week (optional)
              <input
                type="number"
                min={0.5}
                max={80}
                step={0.5}
                inputMode="decimal"
                value={sc.weekHours ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  set({ weekHours: e.target.value && Number.isFinite(n) && n > 0 ? Math.min(80, Math.round(n * 2) / 2) : undefined });
                }}
              />
            </label>
          </div>
          <details className="sched-times">
            <summary>
              Time of day (optional){sc.from || sc.to ? `: ${sc.from ?? "?"} to ${sc.to ?? "?"}` : ""}
            </summary>
            <div className="sched-grid">
              {time("from", "From")}
              {time("to", "To")}
            </div>
          </details>
        </>
      )}
      {sc.mode === "span" && <div className="sched-grid">{date("start", "From")}{date("end", "To (optional)")}</div>}
      {sc.mode === "once" && (
        <div className="sched-grid">
          {date("start", "Date")}
          {time("from", "From (optional)")}
          {time("to", "To (optional)")}
        </div>
      )}
      {sc.mode === "event" && (
        <div className="sched-grid">
          {date("start", "First day")}
          {date("end", "Last day")}
          {time("from", "Daily from (optional)")}
          {time("to", "Daily to (optional)")}
        </div>
      )}
      {sc.mode === "range" && (
        <div className="sched-grid">
          {date("start", "From date")}
          {time("from", "From time (optional)")}
          {date("end", "To date")}
          {time("to", "To time (optional)")}
        </div>
      )}
      {sc.mode === "recurring" && (
        <>
          <div className="sched-grid">
            <label>
              Repeats
              <select value={sc.freq ?? "weekly"} onChange={(e) => set({ freq: e.target.value as "weekly" | "monthly" })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly (same date)</option>
              </select>
            </label>
            <label>
              Every
              <select value={sc.interval ?? 1} onChange={(e) => set({ interval: Number(e.target.value) > 1 ? Number(e.target.value) : undefined })}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? (sc.freq === "monthly" ? "month" : "week") : `${n} ${sc.freq === "monthly" ? "months" : "weeks"}`}
                  </option>
                ))}
              </select>
            </label>
            {date("start", "First date")}
            {date("end", "Until (optional)")}
            {time("from", "From")}
            {time("to", "To")}
          </div>
          {sc.freq !== "monthly" && (
            <>
              <span className="field-hint">On (empty means the weekday of the first date)</span>
              {days}
            </>
          )}
        </>
      )}
      {summary && (
        <span className="sched-summary">
          {sc.mode === "recurring" ? <Repeat size={13} /> : <CalendarClock size={13} />}
          {summary}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Home (team front page) */

type Upcoming = { date: string; time?: string; label: string; what: string; projectId: string };

/** Meetings and activities in the next 30 days, and project dates in the next 60. */
export function upcomingItems(plan: Plan, today: string): Upcoming[] {
  const periods = periodsOf(plan);
  const add = (d: string, n: number) => {
    const x = parseDate(d);
    x.setDate(x.getDate() + n);
    return dateKey(x);
  };
  const out: Upcoming[] = [];
  const to30 = add(today, 29),
    to60 = add(today, 59);
  for (const p of plan.projects) {
    if (p.status === "finished" || p.status === "rejected") continue;
    if (p.schedule && p.schedule.mode !== "span" && p.schedule.mode !== "periods") {
      const sc = p.schedule;
      const days = scheduleDays(sc, periods, today, to30);
      const isRange = sc.mode === "event" || sc.mode === "range";
      days.slice(0, isRange ? 1 : 2).forEach((d) =>
        out.push({
          date: d.date,
          time: sc.from && sc.to ? `${sc.from} to ${sc.to}` : sc.from,
          label: p.name,
          what: isRange && sc.end && sc.end !== d.date ? `until ${dayLabel(sc.end)}` : modeLabels[sc.mode],
          projectId: p.id,
        }),
      );
    }
    const d = p.dates ?? {};
    const marks: [string | undefined, string][] = [
      [d.appDue, "Application due"],
      [d.decisionOn, "Funding decision"],
      [d.start ?? d.plannedStart, "Project starts"],
      [currentEnd(p), "Project ends"],
    ];
    for (const [date, what] of marks)
      if (date && date >= today && date <= to60) out.push({ date, label: p.name, what, projectId: p.id });
  }
  return out.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))).slice(0, 10);
}

export function HomeView({
  plan,
  teamName,
  today,
  analytics,
  open,
  onEdit,
  onTeam,
  onProjects,
  onAnalytics,
  onStage,
}: {
  plan: Plan;
  teamName: string;
  today: string;
  analytics: React.ReactNode;
  open: Open;
  onEdit: () => void;
  onTeam: () => void;
  onProjects: () => void;
  onAnalytics: () => void;
  onStage?: (stage: string) => void;
}) {
  const pr = plan.profile ?? {};
  const abbr = teamAbbr(plan, teamName);
  const full = teamFullName(plan, teamName);
  const lead = pr.leadId ? plan.people.find((x) => x.id === pr.leadId) : undefined;
  const coord = coordinatorId(plan);
  const people = coordinatorFirst(
    plan,
    [...plan.people].sort((a, b) => (a.id === pr.leadId ? -1 : b.id === pr.leadId ? 1 : a.name.localeCompare(b.name))),
    (p) => p.id,
  );
  const research = plan.projects.filter((p) => !isActivity(p));
  const running = research.filter((p) => p.status === "ongoing" || p.status === "granted");
  const activities = plan.projects.filter((p) => isActivity(p) && p.status !== "finished");
  const empty = !pr.fullName && !pr.description && !pr.organisation;
  const upcoming = upcomingItems(plan, today);
  const points = teamMilestones(plan, today, { days: 90 });
  const site = pr.website && (/^https?:\/\//i.test(pr.website) ? pr.website : `https://${pr.website}`);
  // v36: the headline tile, in plain words.
  const items = homeInsights(plan, today);
  const showMilestones = () => {
    try {
      localStorage.setItem("tc-layout-projects", "milestones");
    } catch {}
    onProjects();
  };
  const go = (i: Insight) => {
    const t = i.target;
    if (t.kind === "person") open({ type: "person", id: t.id });
    else if (t.kind === "project") open({ type: "projectView", id: t.id });
    else if (t.kind === "people") onTeam();
    else if (t.kind === "milestones") showMilestones();
    else if (t.stage && onStage) onStage(t.stage);
    else onProjects();
  };
  return (
    <div className="home bento">
      <section className={`card bento-headline ${items.some((i) => i.tone !== "good") ? "" : "all-clear"}`} aria-labelledby="bento-big">
        <span className="bento-eyebrow">{dayLabel(today)}</span>
        <h2 id="bento-big" className="bento-big">{homeHeadline(items)}</h2>
        {items.length ? (
          <ul className="insight-list">
            {items.slice(0, 5).map((i) => (
              <li key={i.id}>
                <button type="button" className={`insight ${i.tone}`} onClick={() => go(i)}>
                  <i className="insight-dot" aria-hidden="true" />
                  <span>{i.text}</span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Add people, projects and assignments, and this tile will point out what may need a look.</p>
        )}
        {upcoming.length > 0 ? (
          <div className="bento-next">
            <span className="bento-eyebrow">Next up</span>
            <ul>
              {upcoming.slice(0, 4).map((u, i) => (
                <li key={`${u.projectId}-${u.date}-${i}`}>
                  <button type="button" onClick={() => open({ type: "projectView", id: u.projectId })}>
                    <span className="bn-date">{dayLabel(u.date)}</span>
                    <span className="bn-what">
                      <b>{u.label}</b> <small>{u.what}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="bento-next muted">
            Nothing coming up in the next month. Meetings and events appear here when activities have dates, and
            deadlines, decisions and project ends when projects have dates.
          </p>
        )}
        <p className="bento-foot">Indications to talk about, not measurements of anyone's effort.</p>
      </section>
      <section className="home-hero">
        <span className="home-abbr" aria-hidden="true">{/* v35: a long team name without an abbreviation shows its initials, not a cut-off word. */}
          {abbr.length <= 6 ? abbr : abbr.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 4).toUpperCase()}</span>
        <div className="home-hero-text">
          {pr.organisation && <p className="home-org">{pr.organisation}</p>}
          <h2>{full}</h2>
          {pr.description ? (
            <p className="home-desc">{pr.description}</p>
          ) : (
            empty && (
              <p className="home-desc muted">
                Add the team's full name, abbreviation, organisation and a short description so everyone sees
                what the team is about.
              </p>
            )
          )}
          {!!pr.focus?.length && (
            <ul className="home-focus" aria-label="Focus areas">
              {pr.focus.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <div className="home-meta">
            {lead && (
              <span>
                <Crown size={14} /> Team lead: <b>{lead.name}</b>
              </span>
            )}
            <span>
              <Users size={14} /> {plan.people.length} {plan.people.length === 1 ? "member" : "members"}
            </span>
            <span>
              <FolderKanban size={14} /> {running.length} running {running.length === 1 ? "project" : "projects"}
              {activities.length ? `, ${activities.length} ${activities.length === 1 ? "activity" : "activities"}` : ""}
            </span>
            {site && (
              <a href={site} target="_blank" rel="noreferrer">
                <Globe size={14} /> {pr.website!.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
              </a>
            )}
            {pr.email && (
              <a href={`mailto:${pr.email}`}>
                <Mail size={14} /> {pr.email}
              </a>
            )}
          </div>
        </div>
        <button className="btn home-edit" onClick={onEdit}>
          <Pencil size={15} />
          {empty ? "Add team details" : "Edit team details"}
        </button>
      </section>

      <div className="bento-wide">
        <div className="home-section-head">
          <h3>At a glance</h3>
          <button className="text-btn" onClick={onAnalytics}>
            Full analytics <ArrowUpRight size={14} />
          </button>
        </div>
        {analytics}
      </div>

      <BusiestPeople plan={plan} open={open} onTeam={onTeam} />
        <section className="card home-card bento-people">
          <div className="home-section-head">
            <h3>People</h3>
            <button className="text-btn" onClick={onTeam}>
              Team view <ArrowUpRight size={14} />
            </button>
          </div>
          {people.length ? (
            <ul className="home-people">
              {people.map((p) => (
                <li key={p.id} className={p.id === coord ? "coord" : undefined}>
                  <button type="button" onClick={() => open({ type: "person", id: p.id })}>
                    <Ring name={p.name} tone={accentFor(p.name)} size={34} />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {[p.id === coord && "Coordinator", p.id === pr.leadId && "Team lead", p.role].filter(Boolean).join(" · ") || "\u00a0"}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No one added yet.</p>
          )}
        </section>
      <section className="card home-card home-ms">
        <div className="home-section-head">
          <h3>Milestones and deadlines</h3>
          <button className="text-btn" onClick={showMilestones}>
            All milestones <ArrowUpRight size={14} />
          </button>
        </div>
        {points.length ? (
          <MilestoneList entries={points} today={today} open={open} max={8} />
        ) : (
          <p className="muted">
            Nothing overdue or due in the next three months. Projects can have milestones and deadlines (optional):
            open a project and choose Edit.
          </p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------- Project overview (v11) */
const stateLabelOf = (s: string) => s[0].toUpperCase() + s.slice(1);

/** A larger read-only card for one project or activity; Edit switches to the form. */
export function ProjectDetail({
  plan,
  project: p,
  week,
  open,
  onAddTeam,
  onRemove,
}: {
  plan: Plan;
  project: Project;
  week: string;
  open: Open;
  onAddTeam: () => void;
  /** Take a person off this project (with Undo in the toast). */
  onRemove?: (assignmentId: string) => void;
}) {
  const acc = accentOf(p, false);
  const track = tracksCapacity(plan);
  const self: OpenArg = { type: "projectView", id: p.id };
  const team = plan.assignments
    .filter((a) => a.projectId === p.id)
    .map((a) => ({ a, person: plan.people.find((x) => x.id === a.personId)! }))
    .filter((x) => x.person)
    .sort((x, y) =>
      (x.a.status === "finished" ? 1 : 0) - (y.a.status === "finished" ? 1 : 0) || x.person.name.localeCompare(y.person.name),
    );
  const active = team.filter((x) => x.a.status !== "finished");
  const hoursOf = (id: string) =>
    plan.allocations.filter((x) => x.week === week && x.assignmentId === id).reduce((s, x) => s + x.hours, 0);
  const weekHours = active.reduce((s, x) => s + hoursOf(x.a.id), 0);
  const estimated = active.filter((x) => x.a.estimated).length;
  const d = p.dates ?? {};
  const range = (a?: string, b?: string) => (a && b ? `${dayLabel(a)} to ${dayLabel(b)}` : a ? `From ${dayLabel(a)}` : b ? `Until ${dayLabel(b)}` : "");
  const end = currentEnd(p);
  const facts: [string, React.ReactNode][] = [];
  if (isActivity(p)) facts.push(["Kind", kindLabels[kindOf(p)]]);
  else if (p.type) facts.push(["Type", p.type]);
  if (p.funder) facts.push(["Funder", p.funder]);
  if (p.centre) facts.push(["Research centre", p.centre]);
  if (isActivity(p) && p.schedule) facts.push(["When", scheduleSummary(p.schedule, periodsOf(plan))]);
  if (d.appStart || d.appDue) facts.push(["Application", range(d.appStart, d.appDue)]);
  if (d.decisionOn) facts.push(["Decision", dayLabel(d.decisionOn)]);
  if (d.start || d.end) facts.push(["Contract period", range(d.start, d.end)]);
  else if (d.plannedStart || d.plannedEnd) facts.push(["Proposed period", range(d.plannedStart, d.plannedEnd)]);
  if (p.extensions?.length && end && d.end) facts.push(["Original end", dayLabel(d.end)]);
  if (p.extensions?.length && end) facts.push(["Extended to", `${dayLabel(end)} (${p.extensions.length} ${p.extensions.length === 1 ? "extension" : "extensions"})`]);
  if (d.finishedOn) facts.push(["Finished on", dayLabel(d.finishedOn)]);
  if (!facts.some(([k]) => /period|When/.test(k))) {
    const y = yearsLabel(p);
    if (y) facts.push(["Years", y]);
  }
  facts.push(["People", `${active.length} active${team.length > active.length ? `, ${team.length - active.length} finished` : ""}`]);
  if (track) {
    facts.push(["This week", `${fmt(weekHours)} h`]);
    facts.push(["Estimates", active.length ? `${estimated} of ${active.length}` : "–"]);
  }
  const points = milestonesOf(p);
  const today = dateKey(new Date());
  const hasTimeline = projectSegments(p, periodsOf(plan)).length > 0 || points.length > 0;
  const missing = plan.people.filter((x) => !team.some((t) => t.person.id === x.id)).length;
  return (
    <div className={`pdetail t-${acc}`}>
      <header className="pdetail-head">
        <div className="pcard-top">
          {isActivity(p) ? (
            <span className={`tag t-${acc}`}>{kindLabels[kindOf(p)]}</span>
          ) : p.type ? (
            <span className={`tag t-${acc}`}>{p.type}</span>
          ) : (
            <span className="tag t-slate dim">No type</span>
          )}
          <span className={`state s-${p.status}`}>
            <i />
            {projectStageLabel(p)}
          </span>
        </div>
        <h2>
          {p.abbreviation?.trim() && p.abbreviation.trim() !== p.name ? (
            <>
              {p.abbreviation.trim()} <span className="pdetail-name">{p.name}</span>
            </>
          ) : (
            p.name
          )}
        </h2>
        {p.fullTitle && <p className="pdetail-full">{p.fullTitle}</p>}
        {rolesOf(plan, p).map((r) => {
          const person = r.personId ? plan.people.find((x) => x.id === r.personId) : undefined;
          return (
            <p className="pcard-pi" key={r.role}>
              <Crown size={14} /> {r.short} <b>{r.name}</b>
              {person?.role ? <span className="muted"> · {person.role}</span> : null}
              {!person ? <span className="muted"> · outside the team</span> : null}
            </p>
          );
        })}
        {p.description && <p className="pdetail-desc">{p.description}</p>}
      </header>
      <dl className="pdetail-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {(p.taskGroups?.length ?? 0) > 0 && (
        <div className="pdetail-groups">
          <span className="muted">Task groups</span>
          <span className="task-chips">
            {p.taskGroups!.map((id) => {
              const t = taskLibrary(plan).find((x) => x.id === id);
              if (!t) return null;
              const n = active.reduce(
                (s, x) => s + ((x.a.tasks ?? []).find((y) => y.taskId === id)?.items ?? []).filter((i) => !i.done).length,
                0,
              );
              return <TaskChip key={id} task={t} extra={n ? `${n} open` : undefined} />;
            })}
          </span>
        </div>
      )}
      <section className="pdetail-section">
        <div className="pdetail-section-head">
          <h3>
            Milestones and deadlines
            {points.length > 0 && (
              <small className="muted">
                {" "}
                {points.filter((m) => m.done).length} of {points.length} done
              </small>
            )}
          </h3>
          <span className="section-actions">
            <button type="button" className="text-btn" onClick={() => open({ type: "project", id: p.id, back: self })}>
              {points.length ? <Pencil size={14} /> : <Plus size={14} />}
              {points.length ? "Edit" : "Add"}
            </button>
          </span>
        </div>
        {points.length ? (
          <MilestoneList entries={points.map((m) => ({ project: p, m }))} today={today} showProject={false} />
        ) : (
          <p className="muted">None yet. Optional: add the points that matter, such as deliverables, reports or a test rig being ready.</p>
        )}
      </section>
      {hasTimeline && (
        <section className="pdetail-section pdetail-timeline">
          <h3>Timeline</h3>
          <ProjectTimeline plan={plan} list={[p]} open={() => {}} />
        </section>
      )}
      <section className="pdetail-section">
        <div className="pdetail-section-head">
          <h3>{isActivity(p) ? "Who takes part" : "Team"}</h3>
          <span className="section-actions">
            {missing > 0 && plan.people.length > 1 && (
              <button type="button" className="text-btn" onClick={onAddTeam}>
                <Users size={14} />
                Add whole team
              </button>
            )}
            <button type="button" className="text-btn" onClick={() => open({ type: "assignment", projectId: p.id, back: self })}>
              <Plus size={14} />
              Add person
            </button>
          </span>
        </div>
        {team.length ? (
          <ul className="pdetail-team">
            {team.map(({ a, person }) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={a.status === "finished" ? "finished" : ""}
                  onClick={() => open({ type: "cell", personId: person.id, projectId: p.id, back: self })}
                >
                  <Ring name={person.name} tone={accentFor(person.name)} size={36} />
                  <span className="pdetail-who">
                    <b>{person.name}</b>
                    <small>{person.role || "\u00a0"}</small>
                    <AssignmentTasks plan={plan} a={a} />
                  </span>
                  {track && a.status !== "finished" && (
                    <span className="assign-hours">{a.estimated ? `${fmt(hoursOf(a.id))} h this week` : "Not estimated"}</span>
                  )}
                  <span className={`pill s-${a.status}`}>{stateLabelOf(a.status)}</span>
                </button>
                {onRemove && (
                  <button
                    type="button"
                    className="pdetail-remove"
                    aria-label={`Remove ${person.name} from ${p.name}`}
                    title={`Remove ${person.name} (hours planned on this ${isActivity(p) ? "activity" : "project"} go too; Undo is in the message)`}
                    onClick={() => onRemove(a.id)}
                  >
                    <X size={15} />
                  </button>
                )}
                <TaskItemsList plan={plan} a={a} max={4} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No one is on this {isActivity(p) ? "activity" : "project"} yet.</p>
        )}
      </section>
      {<ProjectSharedSection plan={plan} projectId={p.id} />}
      {p.notes && (
        <section className="pdetail-section">
          <h3>Notes</h3>
          <p className="pdetail-notes">{p.notes}</p>
        </section>
      )}
      {!!p.dateLog?.length && (
        <section className="pdetail-section">
          <details>
            <summary>History ({p.dateLog.length})</summary>
            <ul className="date-log">
              {[...p.dateLog].reverse().map((c, i) => (
                <li key={i}>
                  <span className="when">{c.on}</span>
                  <b>{c.field}</b>: {c.from || "not set"} → {c.to || "removed"}
                  {c.note && <em> · {c.note}</em>}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

function ProjectSharedSection({ plan, projectId }: { plan: Plan; projectId: string }) {
  const any = workItemsOf(plan).some((w) => workItemProjects(plan, w.id).includes(projectId) && w.status !== "done");
  if (!any) return null;
  return (
    <section className="pdetail-section">
      <h3>Shared work</h3>
      <ProjectShared plan={plan} projectId={projectId} max={20} />
    </section>
  );
}

/* ------------------------------------------------------- Home header (v11) */
export interface WeatherNow {
  temp: number;
  code: number;
  place: string;
  wind?: number;
}
const WEATHER_TEXT: [number[], string, string][] = [
  [[0], "Clear", "☀️"],
  [[1, 2], "Partly cloudy", "⛅"],
  [[3], "Cloudy", "☁️"],
  [[45, 48], "Fog", "🌫️"],
  [[51, 53, 55, 56, 57], "Drizzle", "🌦️"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "🌧️"],
  [[71, 73, 75, 77, 85, 86], "Snow", "🌨️"],
  [[95, 96, 99], "Thunderstorm", "⛈️"],
];
export const weatherText = (code: number) => WEATHER_TEXT.find(([c]) => c.includes(code)) ?? [[code], "Weather", "🌡️"];

export function greetingFor(h: number) {
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeHeader({
  now,
  name,
  teamName,
  weather,
  weatherState,
  onSettings,
}: {
  now: Date;
  name: string;
  teamName: string;
  weather?: WeatherNow;
  /** "off", "loading", "ok" or an error text. */
  weatherState: string;
  onSettings: () => void;
}) {
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const w = weather ? weatherText(weather.code) : undefined;
  // v27: one slim line at the very top of Home, no frame.
  return (
    <section className="home-greet" aria-label="Today">
      <b className="hg-hello">
        {greetingFor(now.getHours())}
        {name ? `, ${name}` : ""}
      </b>
      <span className="hg-sep" aria-hidden="true">·</span>
      <span title={teamName}>
        {time}, {date}
      </span>
      <span className="hg-sep" aria-hidden="true">·</span>
      {weatherState === "off" ? (
        <button type="button" className="text-btn hg-weather" onClick={onSettings} title="Switch weather on in Settings">
          🌤️ Weather
        </button>
      ) : weather && w ? (
        <span className="hg-weather" title={`Open-Meteo, ${weather.place}`}>
          <span aria-hidden="true">{w[2]}</span> {Math.round(weather.temp)}°C {w[1]} · {weather.place}
        </span>
      ) : (
        <span className="hg-weather muted">{weatherState === "loading" ? "Weather loading…" : weatherState}</span>
      )}
    </section>
  );
}

/* ------------------------------------------------- Involvement (v28) */

/** v37: colours follow involvementSignal (model.ts), which also listens to the person's own plate status. */
const STATUS_WORDS: Record<string, string> = { full: "says the plate is full", steady: "says the plate is steady", room: "says there is room" };
function signalTitle(sig: ReturnType<typeof involvementSignal>, name: string) {
  const lvl = `full plate at ${sig.level}% (${sig.ownLevel ? "own level" : "team level"})`;
  const parts = [`${Math.round(sig.total)}% of full time across ${sig.parts.length} ${sig.parts.length === 1 ? "project" : "projects"}`, lvl];
  if (sig.status) parts.push(`${name.split(" ")[0]} ${STATUS_WORDS[sig.status]}`);
  if (sig.mismatch) parts.push("the numbers and the person's own view differ: worth a chat");
  if (sig.unset) parts.push(`${sig.unset} without a %`);
  return parts.join("; ");
}

/** A small bar with a person's total involvement; can go past 100%. */
export function InvolvementMeter({ plan, personId, label = true }: { plan: Plan; personId: string; label?: boolean }) {
  const sig = involvementSignal(plan, personId);
  if (!sig.parts.length) return label ? <small className="inv-meter none">No % set</small> : null;
  const name = plan.people.find((x) => x.id === personId)?.name ?? "";
  const scale = Math.max(150, sig.level * 1.25, sig.total);
  return (
    <span className={`inv-meter t-${sig.tone}`} title={signalTitle(sig, name)}>
      <span className="inv-track">
        <i style={{ width: `${(Math.min(sig.total, scale) / scale) * 100}%` }} />
        <b style={{ left: `${(sig.level / scale) * 100}%` }} aria-hidden="true" />
      </span>
      {label && (
        <em>
          {Math.round(sig.total)}%{sig.alarm ? " · over" : sig.mismatch ? " · check" : ""}
          {sig.ownLevel && <small className="inv-own" title={`Own full-plate level: ${sig.level}%`}> / {sig.level}</small>}
        </em>
      )}
    </span>
  );
}

/** Rows of people with their involvement, highest first. */
function involvementRows(plan: Plan) {
  return plan.people
    .map((p) => {
      const now = personInvolvement(plan, p.id);
      const all = personInvolvement(plan, p.id, { planned: true });
      return { p, now, planned: Math.max(0, all.total - now.total) };
    })
    .sort((a, b) => b.now.total - a.now.total || b.planned - a.planned || a.p.name.localeCompare(b.p.name));
}

/** Home: the people with the most on their plate (by involvement %, else by projects and tasks). */
export function BusiestPeople({ plan, open, onTeam, max = 6 }: { plan: Plan; open: Open; onTeam: () => void; max?: number }) {
  const pct = usesPercent(plan);
  const rows = pct
    ? involvementRows(plan).filter((r) => r.now.total > 0).slice(0, max)
    : [...plan.people]
        .map((p) => ({ p, n: assignmentCounts(plan, p.id).active, t: activeTasks(plan, p.id) }))
        .sort((a, b) => b.n - a.n || b.t - a.t)
        .slice(0, max);
  return (
    <section className="card home-card home-busiest">
      <div className="home-section-head">
        <h3>Most involved</h3>
        <button className="text-btn" onClick={onTeam}>
          Team view <ArrowUpRight size={14} />
        </button>
      </div>
      {!rows.length ? (
        <p className="muted">No one is assigned yet.</p>
      ) : (
        <ul className="busiest-list">
          {rows.map((r) => (
            <li key={r.p.id}>
              <button type="button" onClick={() => open({ type: "person", id: r.p.id })}>
                <Ring name={r.p.name} tone={accentFor(r.p.name)} size={30} />
                <span className="busiest-name">
                  <b>{r.p.name}</b>
                  <small>
                    {"now" in r
                      ? `${r.now.parts.length} ${r.now.parts.length === 1 ? "project" : "projects"}${r.planned ? ` · +${Math.round(r.planned)}% planned` : ""}`
                      : `${r.n} ${r.n === 1 ? "project" : "projects"} · ${r.t} ${r.t === 1 ? "task" : "tasks"}`}
                  </small>
                </span>
                {"now" in r ? <InvolvementMeter plan={plan} personId={r.p.id} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!pct && (
        <p className="field-hint">
          Ranked by projects and tasks. Give assignments an involvement % (in the assignment window) to rank by share of time.
        </p>
      )}
    </section>
  );
}

/** Analytics: everyone's involvement as bars, with planned work and each person's full plate level. */
export function InvolvementChart({ plan, open }: { plan: Plan; open: Open }) {
  const rows = involvementRows(plan);
  const scale = Math.max(150, ...rows.map((r) => r.now.total + r.planned), ...rows.map((r) => r.now.level * 1.1));
  const over = rows.filter((r) => involvementSignal(plan, r.p.id).alarm).length;
  const unset = plan.assignments.filter((a) => countsNow(plan, a) && a.status === "ongoing" && involvement(a) === undefined).length;
  return (
    <section className="card inv-chart-card">
      <div className="home-section-head">
        <div>
          <h3>Involvement per person</h3>
          <p className="chart-takeaway">{involvementTakeaway(plan)}</p>
        </div>
        <span className="muted small">
          Percent of full time on ongoing work{over ? ` · ${over} above their full plate level` : ""}
        </span>
      </div>
      <div className="inv-chart" role="list">
        {rows.map((r) => (
          <button type="button" role="listitem" key={r.p.id} className="inv-row" onClick={() => open({ type: "person", id: r.p.id })}>
            <span className="inv-name">{r.p.name}</span>
            <span className="inv-bar">
              {r.now.parts.map((x) => (
                <i
                  key={x.assignment.id}
                  className={`seg t-${involvementSignal(plan, r.p.id).tone}`}
                  style={{ width: `${(x.percent / scale) * 100}%` }}
                  title={`${projectLabel(x.project)}: ${x.percent}%`}
                />
              ))}
              {r.planned > 0 && (
                <i className="seg planned" style={{ width: `${(r.planned / scale) * 100}%` }} title={`Planned: ${Math.round(r.planned)}%`} />
              )}
              <b className="lvl" style={{ left: `${(r.now.level / scale) * 100}%` }} title={`Full plate at ${r.now.level}% (${r.p.fullAt !== undefined ? "own level" : "team level"})`} />
            </span>
            <span className={`inv-val c-${involvementSignal(plan, r.p.id).tone}`} title={signalTitle(involvementSignal(plan, r.p.id), r.p.name)}>
              {r.now.parts.length ? `${Math.round(r.now.total)}%` : "–"}
            </span>
          </button>
        ))}
      </div>
      <p className="field-hint">
        Each block is one project. Light blocks are planned work. The tick is the person's full plate level (team level {overloadLevel(plan)}%, set in
        Settings). {unset ? `${unset} ongoing ${unset === 1 ? "assignment has" : "assignments have"} no % yet.` : ""}
      </p>
    </section>
  );
}

/** Person panel: involvement per project, with the total and the person's level. */
export function PersonInvolvement({ plan, person, open }: { plan: Plan; person: Person; open: Open }) {
  const inv = personInvolvement(plan, person.id);
  const all = personInvolvement(plan, person.id, { planned: true });
  const planned = all.parts.filter((x) => x.assignment.status === "planned");
  if (!all.parts.length && !inv.unset) return null;
  return (
    <section className="person-inv">
      <div className="person-inv-head">
        <h4>Involvement</h4>
        <InvolvementMeter plan={plan} personId={person.id} />
      </div>
      <ul>
        {inv.parts.map((x) => (
          <li key={x.assignment.id}>
            <button type="button" className="text-btn" onClick={() => open({ type: "projectView", id: x.project.id })}>
              {projectLabel(x.project)}
            </button>
            <span className="inv-tasks">
              {(x.assignment.tasks ?? [])
                .filter((t) => t.percent !== undefined)
                .map((t) => `${taskLibrary(plan).find((l) => l.id === t.taskId)?.name ?? "Task"} ${t.percent}%`)
                .join(", ")}
            </span>
            <b>{x.percent}%</b>
          </li>
        ))}
        {planned.map((x) => (
          <li key={x.assignment.id} className="muted">
            <span>{projectLabel(x.project)} (planned)</span>
            <span />
            <b>{x.percent}%</b>
          </li>
        ))}
      </ul>
      <small className="muted">
        Full plate at {inv.level}%{person.fullAt !== undefined ? " (own level)" : " (team level)"}
        {inv.unset ? ` · ${inv.unset} ${inv.unset === 1 ? "project" : "projects"} without a %` : ""}
      </small>
    </section>
  );
}

/* --------------------------------------- Analytics: choose what and how (v29) */

export type AnSection = "builder" | "glance" | "involvement" | "workload" | "summary" | "hours" | "attention";
export const AN_SECTIONS: [AnSection, string][] = [
  ["builder", "Your chart"],
  ["glance", "At a glance"],
  ["involvement", "Involvement per person"],
  ["workload", "Team workload"],
  ["summary", "Tasks or outlook"],
  ["hours", "Hours by project"],
  ["attention", "Needs attention"],
];
export type AnChart = "bars" | "columns" | "donut" | "table";
export interface AnPrefs {
  show: Record<AnSection, boolean>;
  query: AnQuery;
  chart: AnChart;
  top: number;
}
const AN_DEFAULT: AnPrefs = {
  show: { builder: true, glance: true, involvement: true, workload: true, summary: true, hours: true, attention: true },
  query: { measure: "involvement", group: "person", scope: "all", planned: false },
  chart: "bars",
  top: 15,
};
/** Analytics choices, remembered on this computer. */
export function useAnalyticsPrefs(): [AnPrefs, (p: AnPrefs) => void] {
  const [prefs, setPrefs] = useState<AnPrefs>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("tc-analytics") ?? "null");
      if (raw && typeof raw === "object")
        return {
          show: { ...AN_DEFAULT.show, ...(raw.show ?? {}) },
          query: { ...AN_DEFAULT.query, ...(raw.query ?? {}) },
          chart: ["bars", "columns", "donut", "table"].includes(raw.chart) ? raw.chart : "bars",
          top: [5, 10, 15, 25, 100].includes(raw.top) ? raw.top : 15,
        };
    } catch {}
    return AN_DEFAULT;
  });
  const set = (p: AnPrefs) => {
    setPrefs(p);
    try {
      localStorage.setItem("tc-analytics", JSON.stringify(p));
    } catch {}
  };
  return [prefs, set];
}

const AN_TONES = ["blue", "violet", "green", "amber", "rose", "teal", "orange", "slate"];

/** Chips that switch the Analytics sections on and off. */
export function AnalyticsSections({ prefs, onChange, track }: { prefs: AnPrefs; onChange: (p: AnPrefs) => void; track: boolean }) {
  return (
    <div className="an-sections" role="group" aria-label="Sections to show">
      <span className="an-label">Show</span>
      {AN_SECTIONS.map(([k, label]) => (
        <button
          type="button"
          key={k}
          className={`task-chip pick t-blue ${prefs.show[k] ? "on" : ""}`}
          aria-pressed={prefs.show[k]}
          onClick={() => onChange({ ...prefs, show: { ...prefs.show, [k]: !prefs.show[k] } })}
        >
          {k === "hours" && !track ? "People per project" : k === "summary" && track ? "Outlook" : k === "summary" ? "Tasks overview" : label}
        </button>
      ))}
    </div>
  );
}

/** A chart you put together: what to measure, how to group it and how to draw it. */
export function AnalyticsBuilder({ plan, prefs, onChange }: { plan: Plan; prefs: AnPrefs; onChange: (p: AnPrefs) => void }) {
  const q = prefs.query;
  const setQ = (patch: Partial<AnQuery>) => onChange({ ...prefs, query: { ...q, ...patch } });
  const all = analyticsData(plan, q);
  const data = all.slice(0, prefs.top);
  const rest = all.slice(prefs.top).reduce((t, x) => t + x.value, 0);
  const max = Math.max(1, ...data.map((x) => x.value));
  const pct = q.measure === "involvement";
  const fmtV = (v: number) => (pct ? `${Math.round(v)}%` : String(Math.round(v * 10) / 10));
  const total = all.reduce((t, x) => t + x.value, 0);
  const level = overloadLevel(plan);
  const title = `${anMeasureLabels[q.measure]} by ${anGroupLabels[q.group].toLowerCase()}`;
  return (
    <section className="card an-builder">
      <div className="an-head">
        <div>
          <h2>{title}</h2>
          <p className="chart-takeaway">{largestTakeaway(all, fmtV, !(pct && q.group === "person"))}</p>
          <p className="muted">
            {q.planned ? "Ongoing and planned work" : "Ongoing work"}
            {q.scope === "research" ? ", research projects" : q.scope === "activities" ? ", activities" : ""} · total {fmtV(total)}
          </p>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Chart type">
          {(
            [
              ["bars", "Bars"],
              ["columns", "Columns"],
              ["donut", "Donut"],
              ["table", "Table"],
            ] as [AnChart, string][]
          ).map(([k, label]) => (
            <button key={k} role="radio" aria-checked={prefs.chart === k} className={prefs.chart === k ? "selected" : ""} onClick={() => onChange({ ...prefs, chart: k })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="an-controls">
        <label>
          Measure
          <select value={q.measure} onChange={(e) => setQ({ measure: e.target.value as AnMeasure })}>
            {(Object.keys(anMeasureLabels) as AnMeasure[]).map((k) => (
              <option key={k} value={k}>
                {anMeasureLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grouped by
          <select value={q.group} onChange={(e) => setQ({ group: e.target.value as AnGroup })}>
            {(Object.keys(anGroupLabels) as AnGroup[]).map((k) => (
              <option key={k} value={k}>
                {anGroupLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Work
          <select value={q.scope ?? "all"} onChange={(e) => setQ({ scope: e.target.value as AnScope })}>
            <option value="all">Projects and activities</option>
            <option value="research">Research projects only</option>
            <option value="activities">Activities only</option>
          </select>
        </label>
        <label>
          Show
          <select value={prefs.top} onChange={(e) => onChange({ ...prefs, top: Number(e.target.value) })}>
            {[5, 10, 15, 25, 100].map((n) => (
              <option key={n} value={n}>
                {n === 100 ? "All" : `Top ${n}`}
              </option>
            ))}
          </select>
        </label>
        <label className="check-line">
          <input type="checkbox" checked={!!q.planned} onChange={(e) => setQ({ planned: e.target.checked })} />
          Include planned
        </label>
      </div>
      {!data.length ? (
        <p className="muted pad">
          Nothing to show yet.{pct ? " Give assignments an involvement % in the assignment window." : ""}
        </p>
      ) : prefs.chart === "table" ? (
        <table className="list-table an-table">
          <thead>
            <tr>
              <th>{anGroupLabels[q.group]}</th>
              <th className="num">{anMeasureLabels[q.measure]}</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.key}>
                <th>{x.label}</th>
                <td className="num">{fmtV(x.value)}</td>
                <td className="num muted">{total ? `${Math.round((x.value / total) * 100)}%` : "–"}</td>
              </tr>
            ))}
            {rest > 0 && (
              <tr className="muted">
                <th>{all.length - data.length} more</th>
                <td className="num">{fmtV(rest)}</td>
                <td className="num">{Math.round((rest / total) * 100)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : prefs.chart === "donut" ? (
        <div className="an-donut">
          <Donut
            size={180}
            slices={[
              ...data.map((x, i) => ({ label: x.label, value: x.value, tone: AN_TONES[i % AN_TONES.length] })),
              ...(rest > 0 ? [{ label: "Others", value: rest, tone: "slate" }] : []),
            ]}
            center={fmtV(total)}
          />
          <ul className="an-legend">
            {data.map((x, i) => (
              <li key={x.key}>
                <i className={`t-${AN_TONES[i % AN_TONES.length]}`} />
                <span>{x.label}</span>
                <b>{fmtV(x.value)}</b>
              </li>
            ))}
            {rest > 0 && (
              <li>
                <i className="t-slate" />
                <span>Others</span>
                <b>{fmtV(rest)}</b>
              </li>
            )}
          </ul>
        </div>
      ) : prefs.chart === "columns" ? (
        <div className="an-cols" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(28px, 1fr))` }}>
          {data.map((x, i) => (
            <div className="an-col" key={x.key} title={`${x.label}: ${fmtV(x.value)}`}>
              <b>{fmtV(x.value)}</b>
              <span className="an-col-bar">
                <i className={`t-${AN_TONES[i % AN_TONES.length]}`} style={{ height: `${(x.value / max) * 100}%` }} />
              </span>
              <small>{x.label}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="an-bars">
          {data.map((x, i) => {
            const who = pct && q.group === "person" ? plan.people.find((p) => p.id === x.key) : undefined;
            // v37: no red for someone who says the plate is steady or has room.
            const over = !!who && x.value > (who.fullAt ?? level) && who.status !== "steady" && who.status !== "room";
            return (
              <div className="an-bar-row" key={x.key}>
                <span className="an-bar-label">{x.label}</span>
                <span className="an-bar">
                  <i className={`t-${over ? "red" : AN_TONES[i % AN_TONES.length]}`} style={{ width: `${(x.value / max) * 100}%` }} />
                </span>
                <b className={over ? "c-red" : ""}>{fmtV(x.value)}</b>
              </div>
            );
          })}
          {rest > 0 && <p className="muted small">{all.length - data.length} more, together {fmtV(rest)}</p>}
        </div>
      )}
    </section>
  );
}

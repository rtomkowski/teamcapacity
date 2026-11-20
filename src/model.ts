export type Status = "ongoing" | "planned" | "finished";
export type ProjectStatus =
  Status | "proposal" | "submitted" | "granted" | "rejected" | "unspecified";
export interface Person {
  id: string;
  name: string;
  capacityHours: number | null;
  reservedHours: number;
  notes: string;
  /** Optional, free text (e.g. PI, PhD student, Technician). */
  role?: string;
  /** Self-set workload signal, used when capacity tracking is off. */
  status?: PersonStatus;
  /** Optional short line shown with the status, e.g. "Back from leave in May". */
  statusNote?: string;
  /** Optional small portrait as a data URL (JPEG/PNG/WebP), shown in the avatar ring. */
  photo?: string;
  /** The person's own "full plate" level in percent (v28); omitted means the team's warning level. */
  fullAt?: number;
}
/** Largest accepted photo data URL (about 150 kB of image). */
export const PHOTO_MAX = 200_000;
export const isPhoto = (s: unknown): s is string =>
  typeof s === "string" && s.length <= PHOTO_MAX && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
export type PersonStatus = "full" | "steady" | "room";
export const personStatuses: PersonStatus[] = ["full", "steady", "room"];
export const personStatusLabels: Record<PersonStatus, string> = {
  full: "Full plate",
  steady: "Steady",
  room: "Has room",
};
/** A reusable task in the team's library (Measurement, Machining, ...). */
export interface TaskType {
  id: string;
  name: string;
  /** Optional grouping, e.g. Lab, Analysis, Writing. */
  category?: string;
  /** One of the accent names: blue, violet, green, amber, rose, teal, orange, slate. */
  color?: string;
}
/** A task on an assignment, optionally part of a shared work item. */
export interface AssignmentTask {
  taskId: string;
  note?: string;
  /** Links this task to a work item shared across projects. */
  workItemId?: string;
  /** Concrete tasks within this group, in order, e.g. "Abstract for euspen". */
  items?: TaskItem[];
  /** Share of the person's time this task takes, in percent of full time (v28). */
  percent?: number;
}
/** One concrete task under a task group; ticked off when finished. */
export interface TaskItem {
  id: string;
  text: string;
  done?: boolean;
}
export const ITEMS_MAX = 60;
export const ITEM_TEXT_MAX = 300;
/** Split pasted text into task lines, dropping bullets and numbering ("1.", "2)", "-", "*", "•"). */
export function parseItemLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*\u2022\u2013]|\d{1,3}[.)])\s*/, "").trim())
    .filter(Boolean)
    .map((l) => l.slice(0, ITEM_TEXT_MAX));
}
/** Concrete tasks on an assignment: open and finished counts. */
export function itemCounts(tasks: AssignmentTask[] | undefined): { open: number; done: number } {
  let open = 0,
    done = 0;
  (tasks ?? []).forEach((t) => (t.items ?? []).forEach((i) => (i.done ? done++ : open++)));
  return { open, done };
}
/**
 * A piece of work several projects share, e.g. "Test piece batch A".
 * Projects join it through assignment tasks, each with its own focus
 * (Machining in one project, Measurement in another).
 */
export type WorkStatus = "planned" | "active" | "done";
export const workStatuses: WorkStatus[] = ["planned", "active", "done"];
export const workStatusLabels: Record<WorkStatus, string> = {
  planned: "Planned",
  active: "In progress",
  done: "Done",
};
export interface WorkItem {
  id: string;
  name: string;
  status: WorkStatus;
  note?: string;
  /** Work items that must be done first. */
  waitsOn?: string[];
  /** Projects (or one task in a project) that must be done first. */
  waitsOnProjects?: ProjectRef[];
  /** Projects and tasks taking part without a person yet. People join through their assignment tasks. */
  links?: WorkLink[];
}
export interface ProjectRef {
  projectId: string;
  taskId?: string;
}
export interface WorkLink {
  projectId: string;
  taskId?: string;
}
/** Every part of a work item: from assignment tasks (with a person) and from direct links. */
export function workItemParts(plan: Plan, id: string) {
  const parts: { projectId: string; taskId?: string; personId?: string; assignmentId?: string; note?: string }[] = [];
  workItemUses(plan, id).forEach((u) =>
    parts.push({
      projectId: u.assignment.projectId,
      taskId: u.task.taskId,
      personId: u.assignment.personId,
      assignmentId: u.assignment.id,
      note: u.task.note,
    }),
  );
  const w = workItemsOf(plan).find((x) => x.id === id);
  (w?.links ?? []).forEach((l) => parts.push({ projectId: l.projectId, taskId: l.taskId }));
  return parts;
}
/** A project, or one task in it, counts as done when the project is finished or everyone on that task has finished. */
export function refDone(plan: Plan, r: ProjectRef): boolean {
  const pr = plan.projects.find((x) => x.id === r.projectId);
  if (!pr) return true;
  if (pr.status === "finished" || pr.status === "rejected") return true;
  if (!r.taskId) return false;
  const on = plan.assignments.filter(
    (a) => a.projectId === r.projectId && (a.tasks ?? []).some((t) => t.taskId === r.taskId),
  );
  return on.length > 0 && on.every((a) => a.status === "finished");
}
export function refLabel(plan: Plan, r: ProjectRef): string {
  const pr = plan.projects.find((x) => x.id === r.projectId)?.name ?? "Removed project";
  const t = r.taskId ? taskLibrary(plan).find((x) => x.id === r.taskId)?.name : undefined;
  return t ? `${t} in ${pr}` : pr;
}
/** Names of everything a work item still waits on: shared work, projects and tasks. */
export function blockerLabels(plan: Plan, w: WorkItem): string[] {
  return [
    ...openBlockers(plan, w).map((x) => x.name),
    ...(w.waitsOnProjects ?? []).filter((r) => !refDone(plan, r)).map((r) => refLabel(plan, r)),
  ];
}
export const workItemsOf = (plan: Plan): WorkItem[] => plan.workItems ?? [];
/** Every task linked to a work item, with its project and person. */
export function workItemUses(plan: Plan, id: string) {
  const out: { assignment: Assignment; task: AssignmentTask }[] = [];
  plan.assignments.forEach((a) =>
    (a.tasks ?? []).forEach((t) => {
      if (t.workItemId === id) out.push({ assignment: a, task: t });
    }),
  );
  return out;
}
/** Project ids taking part in a work item, in first-use order. */
export function workItemProjects(plan: Plan, id: string): string[] {
  return [...new Set(workItemParts(plan, id).map((u) => u.projectId))];
}
/** Work items this one waits on that are not done yet. */
export function openBlockers(plan: Plan, w: WorkItem): WorkItem[] {
  const all = workItemsOf(plan);
  return (w.waitsOn ?? [])
    .map((id) => all.find((x) => x.id === id))
    .filter((x): x is WorkItem => !!x && x.status !== "done");
}
/** Work items that wait on this one. */
export function dependentsOf(plan: Plan, id: string): WorkItem[] {
  return workItemsOf(plan).filter((w) => (w.waitsOn ?? []).includes(id));
}
/** True when `from` waiting on `to` would close a loop. */
export function wouldLoop(items: WorkItem[], from: string, to: string): boolean {
  if (from === to) return true;
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(items.find((x) => x.id === id)?.waitsOn ?? []));
  }
  return false;
}
export const TASK_COLORS = ["blue", "violet", "green", "amber", "rose", "teal", "orange", "slate"];
export const DEFAULT_TASKS: TaskType[] = [
  { id: "t-setup", name: "Setup preparation", category: "Lab", color: "amber" },
  { id: "t-machining", name: "Machining", category: "Lab", color: "orange" },
  { id: "t-measurement", name: "Measurement", category: "Lab", color: "teal" },
  { id: "t-testing", name: "Testing", category: "Lab", color: "green" },
  { id: "t-analysis", name: "Data analysis", category: "Analysis", color: "blue" },
  { id: "t-modelling", name: "Modelling and simulation", category: "Analysis", color: "violet" },
  { id: "t-writing", name: "Writing", category: "Writing", color: "rose" },
  { id: "t-coordination", name: "Coordination", category: "Management", color: "slate" },
  { id: "t-teaching", name: "Lectures and labs", category: "Teaching", color: "violet" },
  { id: "t-supervision", name: "Supervision", category: "Teaching", color: "teal" },
];
export const taskLibrary = (plan: Plan): TaskType[] =>
  plan.taskLibrary ?? DEFAULT_TASKS;
/** Capacity tracking (hours, % busy) is off unless switched on in Settings. */
export const tracksCapacity = (plan: Plan) =>
  plan.settings.capacityTracking === true;
/** What a project record is. Omitted means a research project. */
export type Kind = "project" | "teaching" | "supervision" | "networking" | "other";
export const kinds: Kind[] = [
  "project",
  "teaching",
  "supervision",
  "networking",
  "other",
];
export const kindLabels: Record<Kind, string> = {
  project: "Research project",
  teaching: "Teaching",
  supervision: "Supervision",
  networking: "Networking",
  other: "Other activity",
};
export const kindOf = (p: { kind?: Kind } | undefined): Kind =>
  p?.kind ?? "project";
export const isActivity = (p: { kind?: Kind } | undefined) =>
  kindOf(p) !== "project";
export interface Project {
  id: string;
  /** Optional; omitted means "project". */
  kind?: Kind;
  name: string;
  /** Short name used on cards and the timeline, e.g. "NOVA" (v27). */
  abbreviation?: string;
  /** The project's full official title, shown on the project page (v27). */
  fullTitle?: string;
  status: ProjectStatus;
  notes: string;
  /** Optional descriptive fields, all may be blank. */
  type?: string;
  funder?: string;
  /** Research centre or consortium the project belongs to, e.g. a competence centre (v31). */
  centre?: string;
  /** The team's own stage (an id in settings.stages); status then holds the built-in stage it works like. */
  stage?: string;
  startYear?: number | null;
  endYear?: number | null;
  description?: string;
  /** Full dates for the timeline; years above are kept in sync. */
  dates?: ProjectDates;
  /** When an activity happens (teaching periods, a span, meetings, events). */
  schedule?: Schedule;
  /** Prolongations, in order; each moves the end date. */
  extensions?: Extension[];
  /** History of date changes, oldest first. */
  dateLog?: DateChange[];
  /** Task groups this project uses (task library ids), offered first when assigning people. */
  taskGroups?: string[];
  /** Principal investigator (a person id), optional (v25). */
  piId?: string;
  /** People in named roles for activities (v26): course responsible, supervisors, host, or a free role. */
  roles?: RoleEntry[];
  /** Optional dated points within the project: milestones and deadlines. */
  milestones?: Milestone[];
}
/** A person in a named role: a team member (personId) or someone outside the team (name). */
export interface RoleEntry {
  role: string;
  personId?: string;
  name?: string;
}
export const ROLES_MAX = 10;
export const PROJECT_ABBR_MAX = 30;
/** The name to show on cards and the timeline: the abbreviation when there is one (v27). */
export const projectLabel = (p: { name: string; abbreviation?: string }) => p.abbreviation?.trim() || p.name;
export const ROLE_TEXT_MAX = 120;
/** The fixed roles each activity kind offers (v26). "other" takes one free role name; research uses piId. */
export const ROLES_FOR: Record<Kind, string[]> = {
  project: [],
  teaching: ["Course responsible"],
  supervision: ["Supervisor", "Assistant supervisor"],
  networking: ["Host"],
  other: [],
};
/** Display name of a role entry: the team member's current name, else the typed name. */
export function roleName(plan: Plan, r: RoleEntry): string {
  const person = r.personId ? plan.people.find((x) => x.id === r.personId) : undefined;
  return person?.name ?? r.name ?? "";
}
/** Everyone in a role on a project or activity, PI first, in the order the kind lists them. */
export function rolesOf(plan: Plan, p: Project): { role: string; name: string; short: string; personId?: string }[] {
  const out: { role: string; name: string; short: string; personId?: string }[] = [];
  const pi = piOf(plan, p);
  if (kindOf(p) === "project" && pi) out.push({ role: "PI", name: pi.name, short: "PI", personId: pi.id });
  if (kindOf(p) !== "project")
    for (const r of p.roles ?? []) {
      const name = roleName(plan, r);
      if (!name || !r.role.trim()) continue;
      const person = r.personId && plan.people.some((x) => x.id === r.personId) ? r.personId : undefined;
      out.push({ role: r.role, name, short: r.role, personId: person });
    }
  return out;
}
/** One line such as "PI Maja Lindqvist" or "Supervisor Tomas Berg · Assistant supervisor Ana Ruiz". */
export const rolesText = (plan: Plan, p: Project) => rolesOf(plan, p).map((r) => `${r.short} ${r.name}`).join(" · ");
/** A milestone (something reached) or a deadline (something due) on one day. */
export type MilestoneKind = "milestone" | "deadline";
export const milestoneKinds: MilestoneKind[] = ["milestone", "deadline"];
export const milestoneKindLabels: Record<MilestoneKind, string> = { milestone: "Milestone", deadline: "Deadline" };
export interface Milestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  /** Reached or delivered. */
  done?: boolean;
  /** Set when the date was moved (v25): the date before the last move, the first date, and when. */
  movedFrom?: string;
  originalDate?: string;
  movedOn?: string;
}
export const MILESTONES_MAX = 200;
export const MILESTONE_TITLE_MAX = 300;
/** done, overdue (past and open), soon (within `soonDays`) or later. */
export type MilestoneState = "done" | "overdue" | "soon" | "later";
export function milestoneState(m: Milestone, today: string, soonDays = 14): MilestoneState {
  if (m.done) return "done";
  if (m.date < today) return "overdue";
  return m.date <= addDays(today, soonDays) ? "soon" : "later";
}
const byDate = (a: Milestone, b: Milestone) =>
  a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "deadline" ? -1 : 1) || a.title.localeCompare(b.title);
/** The project's milestones and deadlines in date order. */
export const milestonesOf = (p: Project): Milestone[] => [...(p.milestones ?? [])].sort(byDate);
/** The first open point: an overdue one, else the next one ahead. */
export function nextMilestone(p: Project): Milestone | undefined {
  return milestonesOf(p).find((m) => !m.done);
}
/** Projects that are closed (finished or rejected) do not chase their open points. */
const closed = (p: Project) => p.status === "finished" || p.status === "rejected";
export interface MilestoneEntry {
  project: Project;
  m: Milestone;
  state: MilestoneState;
}
/**
 * Points across the team, in date order. By default: open points that are overdue
 * or due within `days`, on projects that are still open.
 */
export function teamMilestones(
  plan: Plan,
  today: string,
  opts: { days?: number; projects?: Project[]; done?: boolean; overdue?: boolean; closed?: boolean } = {},
): MilestoneEntry[] {
  const to = opts.days == null ? undefined : addDays(today, opts.days);
  const out: MilestoneEntry[] = [];
  for (const p of opts.projects ?? plan.projects) {
    if (!opts.closed && closed(p)) continue;
    for (const m of p.milestones ?? []) {
      const state = milestoneState(m, today);
      if (state === "done" && !opts.done) continue;
      if (state === "overdue" && opts.overdue === false) continue;
      if (to && m.date > to && state !== "overdue") continue;
      out.push({ project: p, m, state });
    }
  }
  return out.sort((a, b) => byDate(a.m, b.m) || a.project.name.localeCompare(b.project.name));
}
/**
 * Keeps track of moves: when the date differs from the saved one, records the earlier
 * date, the first date and today; moving back to the first date clears the record.
 */
export function carryMove(saved: Milestone | undefined, m: Milestone, today: string): Milestone {
  delete m.movedFrom;
  delete m.originalDate;
  delete m.movedOn;
  if (!saved) return m;
  const first = saved.originalDate ?? saved.date;
  if (saved.date === m.date) {
    if (saved.movedFrom) m.movedFrom = saved.movedFrom;
    if (saved.originalDate) m.originalDate = saved.originalDate;
    if (saved.movedOn) m.movedOn = saved.movedOn;
  } else if (m.date !== first) {
    m.movedFrom = saved.date;
    m.originalDate = first;
    m.movedOn = today;
  }
  return m;
}
/** "Moved from 30 Nov 2026" (and the first date when it moved more than once), or "". */
export function movedText(m: Milestone, fmt: (d: string) => string): string {
  if (!m.movedFrom) return "";
  const orig = m.originalDate && m.originalDate !== m.movedFrom ? `, originally ${fmt(m.originalDate)}` : "";
  return `Moved from ${fmt(m.movedFrom)}${orig}`;
}

/** The project's PI, if set and still in the team. */
export const piOf = (plan: Plan, p: Project) => (p.piId ? plan.people.find((x) => x.id === p.piId) : undefined);

/** Ticks a point done or opens it again; returns the new done state. */
export function toggleMilestone(plan: Plan, projectId: string, id: string): boolean {
  const m = plan.projects.find((p) => p.id === projectId)?.milestones?.find((x) => x.id === id);
  if (!m) return false;
  if (m.done) delete m.done;
  else m.done = true;
  return !!m.done;
}
/**
 * Project life cycle on one line:
 * application preparation (appStart to appDue), proposed period (tentative),
 * contract period (confirmed start to end), extensions, then finished.
 */
export interface ProjectDates {
  /** Application writing starts. */
  appStart?: string;
  /** Submission date or deadline. */
  appDue?: string;
  /** Expected or actual funding decision. */
  decisionOn?: string;
  /** Period applied for (tentative until granted). */
  plannedStart?: string;
  plannedEnd?: string;
  /** Confirmed contract period. */
  start?: string;
  end?: string;
  /** Actual closing date, if it differs from the end. */
  finishedOn?: string;
}
export interface Extension {
  id: string;
  /** New end date. */
  end: string;
  note?: string;
  /** When the extension was approved. */
  approvedOn?: string;
}
export interface DateChange {
  /** Day the change was made. */
  on: string;
  /** What changed, e.g. "End", "Extension 1" or "Status". */
  field: string;
  /** Old and new value: a date, or a status label for "Status". */
  from?: string;
  to?: string;
  note?: string;
}
export const DATE_FIELDS: { key: keyof ProjectDates; label: string }[] = [
  { key: "appStart", label: "Application start" },
  { key: "appDue", label: "Submission" },
  { key: "decisionOn", label: "Decision" },
  { key: "plannedStart", label: "Proposed start" },
  { key: "plannedEnd", label: "Proposed end" },
  { key: "start", label: "Start" },
  { key: "end", label: "End" },
  { key: "finishedOn", label: "Finished" },
];
/** Days between two YYYY-MM-DD dates (b minus a). */
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
/**
 * When the project end moves (an extension, or a changed end date), open points tied to
 * the end can move by the same number of days. Candidates: saved points that are not
 * done, not already moved in the dialog, and dated no earlier than a month before the old end.
 */
export function endShift(
  oldEnd: string | undefined,
  newEnd: string | undefined,
  draft: { id: string; date: string; done?: boolean }[],
  saved: Milestone[] = [],
): { delta: number; moves: { id: string; from: string; to: string }[] } {
  if (!oldEnd || !newEnd || oldEnd === newEnd) return { delta: 0, moves: [] };
  const delta = daysBetween(oldEnd, newEnd);
  const from = addDays(oldEnd, -31);
  const moves = draft
    .filter((d) => {
      const s = saved.find((m) => m.id === d.id);
      return s && !s.done && !d.done && d.date === s.date && d.date >= from;
    })
    .map((d) => ({ id: d.id, from: d.date, to: addDays(d.date, delta) }));
  return { delta, moves };
}
/** Groups of project dates in the edit dialog. */
export type DateGroup = "app" | "decision" | "proposed" | "contract" | "closing";
/** Date groups shown open for each built-in stage; the others are folded (v22). */
export const DATE_GROUPS_FOR: Record<ProjectStatus, DateGroup[]> = {
  proposal: ["app", "proposed"],
  submitted: ["app", "decision", "proposed"],
  granted: ["decision", "contract"],
  ongoing: ["contract"],
  finished: ["contract", "closing"],
  rejected: ["app", "decision"],
  planned: ["proposed", "contract"],
  unspecified: ["app", "decision", "proposed", "contract", "closing"],
};
/** A teaching period defined once in Settings, e.g. "Period 1". */
export interface TeachingPeriod {
  id: string;
  name: string;
  start: string;
  end: string;
}
export type ScheduleMode = "periods" | "span" | "once" | "recurring" | "event" | "range";
/**
 * When an activity happens. Which fields apply depends on the mode:
 * periods: periodIds (+ optional weekly days and time)
 * span: start to end (end optional)
 * once: start date, optional from-to time
 * recurring: start (first day), optional end, freq weekly/monthly, interval, weekdays, time
 * event: start to end days, optional daily time
 * range: start date+time to end date+time
 */
export interface Schedule {
  mode: ScheduleMode;
  periodIds?: string[];
  start?: string;
  end?: string;
  /** "HH:MM" */
  from?: string;
  to?: string;
  freq?: "weekly" | "monthly";
  /** Every N weeks or months; omitted means 1. */
  interval?: number;
  /** 0 = Monday ... 6 = Sunday. */
  weekdays?: number[];
  /** Teaching on irregular days that change from week to week (weekdays are then ignored), v26. */
  variableDays?: boolean;
  /** Teaching hours per week during the chosen periods, v26. */
  weekHours?: number;
}
export const MODES_FOR: Record<Kind, ScheduleMode[]> = {
  project: [],
  teaching: ["periods"],
  supervision: ["span"],
  networking: ["once", "recurring", "event"],
  other: ["range", "once", "recurring", "event"],
};
export const modeLabels: Record<ScheduleMode, string> = {
  periods: "Teaching periods",
  span: "Time span",
  once: "Single meeting",
  recurring: "Recurring meeting",
  event: "Event or conference",
  range: "From and to",
};
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const periodsOf = (plan: Plan): TeachingPeriod[] => plan.settings.periods ?? [];
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const validTime = (t: unknown): t is string =>
  typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const addDays = (d: string, n: number) => {
  const x = parseDate(d);
  x.setDate(x.getDate() + n);
  return dateKey(x);
};
const weekdayOf = (d: string) => (parseDate(d).getDay() + 6) % 7;
/** Each day the activity happens between from and to (inclusive), with its hours. */
export function scheduleDays(
  sc: Schedule,
  periods: TeachingPeriod[],
  from: string,
  to: string,
): { date: string; hours: number }[] {
  const out: { date: string; hours: number }[] = [];
  const timed = sc.from && sc.to ? Math.max(0, minutes(sc.to) - minutes(sc.from)) / 60 : 0;
  const push = (d: string, h: number) => {
    if (d >= from && d <= to) out.push({ date: d, hours: h });
  };
  const eachDay = (a: string, b: string, fn: (d: string) => void) => {
    let d = a > from ? a : from;
    const end = b < to ? b : to;
    for (let i = 0; d <= end && i < 4000; i++, d = addDays(d, 1)) fn(d);
  };
  switch (sc.mode) {
    case "once":
      if (sc.start) push(sc.start, timed);
      break;
    case "event":
      if (sc.start) eachDay(sc.start, sc.end ?? sc.start, (d) => weekdayOf(d) < 5 || sc.from ? push(d, timed || 8) : undefined);
      break;
    case "range":
      if (sc.start) {
        const end = sc.end ?? sc.start;
        if (end === sc.start) push(sc.start, timed);
        else
          eachDay(sc.start, end, (d) => {
            const h =
              d === sc.start
                ? sc.from ? (24 * 60 - minutes(sc.from)) / 60 : 8
                : d === end
                  ? sc.to ? minutes(sc.to) / 60 : 8
                  : 8;
            if (weekdayOf(d) < 5) push(d, Math.min(h, 8));
          });
      }
      break;
    case "recurring": {
      if (!sc.start) break;
      const n = Math.max(1, sc.interval ?? 1);
      const end = sc.end ?? to;
      if (sc.freq === "monthly") {
        const day = Number(sc.start.slice(8, 10));
        const s0 = parseDate(sc.start);
        for (let i = 0; i < 600; i += n) {
          const x = new Date(s0.getFullYear(), s0.getMonth() + i, 1, 12);
          const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
          x.setDate(Math.min(day, last));
          const d = dateKey(x);
          if (d > end || d > to) break;
          push(d, timed);
        }
      } else {
        const days = sc.weekdays?.length ? sc.weekdays : [weekdayOf(sc.start)];
        const w0 = addDays(sc.start, -weekdayOf(sc.start));
        eachDay(sc.start, end, (d) => {
          // v34: whole days (rounded), so a summer-time change cannot shift the week count.
          const weekIndex = Math.floor(daysBetween(w0, d) / 7);
          if (weekIndex % n === 0 && days.includes(weekdayOf(d))) push(d, timed);
        });
      }
      break;
    }
    case "periods": {
      const ps = periods.filter((p) => sc.periodIds?.includes(p.id));
      // Hours per week, when given, are spread over the teaching days (Mon to Fri when the days vary or are not set).
      const wd = !sc.variableDays && sc.weekdays?.length ? sc.weekdays : sc.weekHours ? [0, 1, 2, 3, 4] : [];
      const per = sc.weekHours ? sc.weekHours / wd.length : timed;
      ps.forEach((p) =>
        eachDay(p.start, p.end, (d) => {
          if (wd.includes(weekdayOf(d))) push(d, per);
        }),
      );
      break;
    }
    case "span":
      break;
  }
  return out;
}
/** Hours per week from a schedule's timed occurrences (for filling capacity). */
export function scheduleWeekHours(sc: Schedule, periods: TeachingPeriod[], week: string): number {
  return scheduleDays(sc, periods, week, addDays(week, 6)).reduce((t, d) => t + d.hours, 0);
}
/** First and last day of a schedule, for the timeline. */
export function scheduleBounds(sc: Schedule, periods: TeachingPeriod[]): [string, string][] {
  if (sc.mode === "periods")
    return periods.filter((p) => sc.periodIds?.includes(p.id)).map((p) => [p.start, p.end]);
  if (!sc.start) return [];
  if (sc.mode === "once") return [[sc.start, sc.start]];
  if (sc.mode === "recurring") {
    if (sc.end) return [[sc.start, sc.end]];
    const today = dateKey(new Date());
    return [[sc.start, addDays(sc.start > today ? sc.start : today, 182)]];
  }
  return [[sc.start, sc.end ?? sc.start]];
}
const fmtD = (d: string) => {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d.slice(8, 10))} ${M[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
};
/** One line describing a schedule, e.g. "Every Monday 09:30 to 09:50". */
export function scheduleSummary(sc: Schedule | undefined, periods: TeachingPeriod[]): string {
  if (!sc) return "";
  const time = sc.from && sc.to ? ` ${sc.from} to ${sc.to}` : sc.from ? ` from ${sc.from}` : "";
  const days = (w?: number[]) =>
    w && w.length ? w.map((i) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]).join(", ") : "";
  switch (sc.mode) {
    case "periods": {
      const names = periods.filter((p) => sc.periodIds?.includes(p.id)).map((p) => p.name);
      const wk = sc.variableDays
        ? ` · Variable days${time}`
        : sc.weekdays?.length ? ` · ${sc.weekdays.map((i) => WEEKDAYS[i]).join(", ")}${time}` : "";
      const hrs = sc.weekHours ? ` · ${sc.weekHours} h per week` : "";
      return names.length ? `${names.join(", ")}${wk}${hrs}` : "No period chosen";
    }
    case "span":
      return sc.start ? (sc.end ? `${fmtD(sc.start)} to ${fmtD(sc.end)}` : `From ${fmtD(sc.start)}`) : "";
    case "once":
      return sc.start ? `${fmtD(sc.start)}${time}` : "";
    case "event":
      return sc.start
        ? sc.end && sc.end !== sc.start
          ? `${fmtD(sc.start)} to ${fmtD(sc.end)}${time ? `, daily${time}` : ""}`
          : `${fmtD(sc.start)}${time}`
        : "";
    case "range":
      return sc.start
        ? `${fmtD(sc.start)}${sc.from ? ` ${sc.from}` : ""} to ${fmtD(sc.end ?? sc.start)}${sc.to ? ` ${sc.to}` : ""}`
        : "";
    case "recurring": {
      const n = sc.interval && sc.interval > 1 ? sc.interval : 1;
      const every =
        sc.freq === "monthly"
          ? n > 1 ? `Every ${n} months on day ${Number((sc.start ?? "").slice(8, 10))}` : `Monthly on day ${Number((sc.start ?? "").slice(8, 10))}`
          : `${n > 1 ? `Every ${n} weeks on` : "Every"} ${days(sc.weekdays?.length ? sc.weekdays : sc.start ? [weekdayOf(sc.start)] : []) || "week"}`;
      const span = sc.end ? ` until ${fmtD(sc.end)}` : "";
      return `${every}${time}${span}`;
    }
  }
}
/** The end date after all extensions. */
export function currentEnd(p: Project): string | undefined {
  const ext = p.extensions ?? [];
  return ext.length ? ext[ext.length - 1].end : p.dates?.end;
}
/**
 * Segments for the timeline. Years without dates become approximate
 * 1 January to 31 December spans.
 */
export function projectSegments(p: Project, periods: TeachingPeriod[] = []) {
  const d = p.dates ?? {};
  const seg: { kind: "prep" | "wait" | "proposed" | "active" | "extension" | "recurring" | "event"; from: string; to: string; label: string; approx?: boolean; note?: string }[] = [];
  if (p.kind && p.kind !== "project" && p.schedule) {
    const sc = p.schedule;
    const label = scheduleSummary(sc, periods);
    scheduleBounds(sc, periods).forEach(([from, to], i) =>
      seg.push({
        kind: sc.mode === "recurring" ? "recurring" : sc.mode === "once" || sc.mode === "event" ? "event" : "active",
        from,
        to,
        label: sc.mode === "periods" ? periods.filter((x) => sc.periodIds?.includes(x.id))[i]?.name ?? label : label,
        note: sc.mode === "periods" ? label : undefined,
      }),
    );
    return seg;
  }
  if (d.appStart || d.appDue) {
    const from = d.appStart ?? d.appDue!, to = d.appDue ?? d.appStart!;
    seg.push({ kind: "prep", from, to, label: "Application" });
  }
  let start = d.start, end = d.end, approx = false;
  if (!start && !end && !d.plannedStart && (p.startYear != null || p.endYear != null)) {
    start = `${p.startYear ?? p.endYear}-01-01`;
    end = `${p.endYear ?? p.startYear}-12-31`;
    approx = true;
  }
  const confirmed = !!(d.start || d.end) && p.status !== "proposal" && p.status !== "submitted";
  if (d.plannedStart && d.plannedEnd && !confirmed)
    seg.push({ kind: "proposed", from: d.plannedStart, to: d.plannedEnd, label: "Proposed period" });
  if (d.appDue) {
    const next = d.decisionOn ?? (confirmed || approx ? start : d.plannedStart);
    if (next && next > d.appDue) seg.push({ kind: "wait", from: d.appDue, to: next, label: "Waiting for decision" });
  }
  if (start && end) {
    seg.push({
      kind: approx
        ? p.status === "proposal" || p.status === "submitted" || p.status === "rejected"
          ? "proposed"
          : "active"
        : confirmed
          ? "active"
          : "proposed",
      from: start,
      to: end,
      label: approx ? "Years only" : confirmed ? "Contract period" : "Proposed period",
      approx,
    });
    let prev = end;
    (p.extensions ?? []).forEach((x, i) => {
      seg.push({ kind: "extension", from: prev, to: x.end, label: `Extension ${i + 1}`, note: x.note });
      prev = x.end;
    });
  }
  return seg;
}
export interface Assignment {
  id: string;
  personId: string;
  projectId: string;
  status: Status;
  estimated: boolean;
  notes: string;
  /** Optional tasks from the team's task library. */
  tasks?: AssignmentTask[];
  /** Share of the person's working time on this project, in percent of full time (v28). Indication only. */
  percent?: number;
}
export const PERCENT_MAX = 200;
export const OVERLOAD_DEFAULT = 100;
const validPercent = (n: unknown) => n === undefined || (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= PERCENT_MAX);
/** Sum of the task percentages on an assignment, or undefined when no task has one. */
export function taskPercent(a: Assignment): number | undefined {
  const xs = (a.tasks ?? []).map((t) => t.percent).filter((x): x is number => typeof x === "number");
  return xs.length ? Math.round(xs.reduce((t, x) => t + x, 0) * 10) / 10 : undefined;
}
/** A person's involvement in one project: the set percentage, else what the tasks add up to. */
export function involvement(a: Assignment): number | undefined {
  return a.percent ?? taskPercent(a);
}
/** Assignments that count towards involvement: not finished, on projects that are not finished or rejected. */
export function countsNow(plan: Plan, a: Assignment): boolean {
  if (a.status === "finished") return false;
  const p = plan.projects.find((x) => x.id === a.projectId);
  return !!p && p.status !== "finished" && p.status !== "rejected";
}
/** The team's overload warning level in percent (Settings), default 100. */
export const overloadLevel = (plan: Plan) => plan.settings.overloadPercent ?? OVERLOAD_DEFAULT;
/** Where this person's plate counts as full: their own level, else the team's. */
export const fullLevel = (plan: Plan, person: Person) => person.fullAt ?? overloadLevel(plan);
/** Total involvement of a person (can exceed 100%), with the parts per project. Ongoing only unless planned is asked for. */
export function personInvolvement(
  plan: Plan,
  personId: string,
  opts: { planned?: boolean } = {},
): { total: number; parts: { assignment: Assignment; project: Project; percent: number }[]; unset: number; level: number; over: boolean } {
  const person = plan.people.find((x) => x.id === personId);
  const parts: { assignment: Assignment; project: Project; percent: number }[] = [];
  let unset = 0;
  for (const a of plan.assignments) {
    if (a.personId !== personId || !countsNow(plan, a)) continue;
    if (a.status === "planned" && !opts.planned) continue;
    const pct = involvement(a);
    const project = plan.projects.find((x) => x.id === a.projectId)!;
    if (pct === undefined) unset++;
    else parts.push({ assignment: a, project, percent: pct });
  }
  parts.sort((x, y) => y.percent - x.percent);
  const total = Math.round(parts.reduce((t, x) => t + x.percent, 0) * 10) / 10;
  const level = person ? fullLevel(plan, person) : overloadLevel(plan);
  return { total, parts, unset, level, over: total > level };
}
export type InvolvementTone = "red" | "amber" | "green" | "slate";
/**
 * What a person's involvement should look like (v37). The person's own word on their plate
 * counts: numbers above the level only raise the alarm (red) when the person has not said
 * "steady" or "has room". When they have, it shows amber as a question ("the numbers say more
 * than you do"), never as a warning. Saying "full plate" makes it at least amber.
 */
export function involvementSignal(plan: Plan, personId: string) {
  const inv = personInvolvement(plan, personId);
  const person = plan.people.find((x) => x.id === personId);
  const status = person?.status;
  const ownLevel = person?.fullAt !== undefined;
  const calm = status === "steady" || status === "room";
  const mismatch = inv.over && calm;
  let tone: InvolvementTone;
  if (!inv.parts.length) tone = status === "full" ? "amber" : "slate";
  else if (inv.over) tone = calm ? "amber" : "red";
  else if (inv.total >= inv.level * 0.85 || status === "full") tone = "amber";
  else tone = "green";
  return { ...inv, status, ownLevel, mismatch, alarm: tone === "red", tone };
}
/** Projects still marked ongoing (or granted) whose end date has passed: worth a look (v34). */
export function staleProjects(plan: Plan, today: string): Project[] {
  return plan.projects.filter((p) => {
    if (isActivity(p) || (p.status !== "ongoing" && p.status !== "granted")) return false;
    const end = currentEnd(p);
    return !!end && end < today;
  });
}
/** Open projects (not finished or rejected) with nobody assigned (v34: closed ones are left out). */
export const unstaffedProjects = (plan: Plan): Project[] =>
  plan.projects.filter(
    (p) => p.status !== "finished" && p.status !== "rejected" && !plan.assignments.some((a) => a.projectId === p.id),
  );
/** Whether anyone in the team has involvement percentages yet. */
export const usesPercent = (plan: Plan) => plan.assignments.some((a) => involvement(a) !== undefined);
export interface Allocation {
  id: string;
  assignmentId: string;
  week: string;
  hours: number;
  /** Optional short description of this week's work. */
  note?: string;
}
export interface CapacityOverride {
  personId: string;
  week: string;
  hours: number;
  /** Optional reason, e.g. "Conference in Lyon". */
  note?: string;
}
export interface Plan {
  version: 1;
  people: Person[];
  projects: Project[];
  assignments: Assignment[];
  allocations: Allocation[];
  capacityOverrides: CapacityOverride[];
  settings: {
    weekCount: number;
    capacityTracking?: boolean;
    periods?: TeachingPeriod[];
    /** Project types offered in pickers and filters; omitted means DEFAULT_TYPES. */
    projectTypes?: string[];
    /** Funders offered in pickers and filters; omitted means the ones in use. */
    funders?: string[];
    /** Stage names and order, plus the team's own stages; omitted means the built-in stages. */
    stages?: StageDef[];
    /** Involvement (percent of full time) above which a gentle warning shows; omitted means 100 (v28). */
    overloadPercent?: number;
  };
  /** Team task library; omitted means DEFAULT_TASKS. */
  taskLibrary?: TaskType[];
  /** Work shared across projects; omitted means none. */
  workItems?: WorkItem[];
  /** Team front page details; all optional. */
  profile?: TeamProfile;
  /** Versions set aside when two people changed the same thing (v30). Newest first. */
  conflicts?: MergeConflict[];
  source: string;
}
/** The other side of a record two people changed at the same time; nothing is thrown away. */
export interface MergeConflict {
  id: string;
  /** When the merge happened (ISO time). */
  at: string;
  /** Which list the record is in, e.g. "projects", or "settings" / "profile". */
  kind: string;
  /** The record's id (or the kind for settings and profile). */
  recordId: string;
  /** Human label, e.g. the project's name. */
  label: string;
  /** What happened: "changed on both sides" or "removed on one side, changed on the other". */
  what: string;
  /** The version that was not kept (JSON). Empty when it was removed. */
  data?: unknown;
}
export const CONFLICTS_MAX = 100;
/** Shown on the Home page; the abbreviation names the team in the left menu. */
export interface TeamProfile {
  abbreviation?: string;
  fullName?: string;
  organisation?: string;
  description?: string;
  focus?: string[];
  website?: string;
  email?: string;
  leadId?: string;
  /** Team coordinator (v27): shown first with a gold frame. Omitted means the team lead. */
  coordinatorId?: string;
}
export const PROFILE_LIMITS = { abbreviation: 12, fullName: 200, organisation: 300, description: 4000, website: 500, email: 200 };
/** Short team name for the menu: abbreviation, else the team's name. */
/** The team coordinator's person id: the chosen coordinator, else the team lead (v27). */
export function coordinatorId(plan: Plan): string | undefined {
  const pr = plan.profile;
  const ok = (id?: string) => (id && plan.people.some((x) => x.id === id) ? id : undefined);
  return ok(pr?.coordinatorId) ?? ok(pr?.leadId);
}
/** A copy of a list with the coordinator moved to the front, the rest in their order. */
export function coordinatorFirst<T>(plan: Plan, list: T[], idOf: (x: T) => string): T[] {
  const c = coordinatorId(plan);
  if (!c) return list;
  return [...list.filter((x) => idOf(x) === c), ...list.filter((x) => idOf(x) !== c)];
}
export const teamAbbr = (plan: Plan, teamName: string) => plan.profile?.abbreviation?.trim() || teamName;
/** Full team name for the Home page: full name, else the team's name. */
export const teamFullName = (plan: Plan, teamName: string) => plan.profile?.fullName?.trim() || teamName;
export const statuses: Status[] = ["ongoing", "planned", "finished"];
export const projectStatuses: ProjectStatus[] = [
  "proposal",
  "submitted",
  "granted",
  "ongoing",
  "rejected",
  "planned",
  "finished",
  "unspecified",
];
/** A stage in Settings: a built-in stage (id = its status) or the team's own (works like a built-in one). */
export interface StageDef {
  id: string;
  label: string;
  /** Own stages only: the built-in stage it behaves like on the timeline and in charts. */
  like?: ProjectStatus;
  /** Left out of the stage picker for new choices; projects already there keep it. */
  hidden?: boolean;
}
export const DEFAULT_TYPES = ["Research", "Teaching", "Development", "Infrastructure", "Other"];
export const LIST_MAX = 100;
export const builtinStageLabel = (s: string) =>
  s === "unspecified" ? "Stage not set" : s[0].toUpperCase() + s.slice(1);
const isBuiltinStage = (s: string): s is ProjectStatus => (projectStatuses as string[]).includes(s);
/** All stages in the team's order: built-in ones with their names, then any own stages. */
export function stageDefs(plan: Plan): StageDef[] {
  const saved = plan.settings.stages ?? [];
  const out: StageDef[] = [];
  const seen = new Set<string>();
  for (const d of saved) {
    if (seen.has(d.id)) continue;
    if (!isBuiltinStage(d.id) && !(d.like && isBuiltinStage(d.like))) continue;
    seen.add(d.id);
    out.push({ ...d, label: d.label.trim() || builtinStageLabel(d.like ?? d.id) });
  }
  for (const s of projectStatuses) if (!seen.has(s)) out.push({ id: s, label: builtinStageLabel(s) });
  return out;
}
/** The stage a project is in: its own stage when set, else its built-in stage. */
export const stageKey = (p: { status: ProjectStatus; stage?: string }) => p.stage ?? p.status;
let stageNames = new Map<string, string>();
/** Called by the app when the plan changes, so labels everywhere use the team's names. */
export function setStageNames(plan: Plan) {
  stageNames = new Map(stageDefs(plan).map((d) => [d.id, d.label]));
}
export const stageLabel = (s: string) => stageNames.get(s) ?? builtinStageLabel(s);
export const projectStageLabel = (p: { status: ProjectStatus; stage?: string }) => stageLabel(stageKey(p));
/** Order of a stage for sorting. */
export function stageOrder(plan: Plan, p: { status: ProjectStatus; stage?: string }) {
  const i = stageDefs(plan).findIndex((d) => d.id === stageKey(p));
  return i < 0 ? 999 : i;
}
const mergeUsed = (list: string[], used: (string | undefined)[]) => {
  const out = [...list];
  const low = new Set(list.map((x) => x.toLowerCase()));
  for (const u of used)
    if (u && !low.has(u.toLowerCase())) {
      low.add(u.toLowerCase());
      out.push(u);
    }
  return out;
};
/** Types for pickers: the team's list (or the defaults), then any other type a project uses. */
export const typeOptions = (plan: Plan) =>
  mergeUsed(plan.settings.projectTypes ?? DEFAULT_TYPES, plan.projects.map((p) => p.type).sort());
/** Types for the filter: the team's list when set, plus the ones in use. */
export const typeFilterOptions = (plan: Plan) =>
  mergeUsed(plan.settings.projectTypes ?? [], plan.projects.map((p) => p.type).sort());
export const funderOptions = (plan: Plan) =>
  mergeUsed(plan.settings.funders ?? [], plan.projects.map((p) => p.funder).sort());
/** Short name of a research centre for cards and filters: the part before a colon, e.g. "CFS". */
export const centreShort = (c?: string) => {
  const t = (c ?? "").trim();
  const i = t.indexOf(":");
  return i > 0 && i <= 20 ? t.slice(0, i).trim() : t;
};
/** Research centres in use, sorted (v31). */
export const centreOptions = (plan: Plan) => mergeUsed([], plan.projects.map((p) => p.centre).sort());
/** Cleans a list typed in Settings: trims, drops blanks and repeats (ignoring case). */
export function cleanList(xs: string[]): string[] {
  const out: string[] = [];
  const low = new Set<string>();
  for (const raw of xs) {
    const x = raw.trim().replace(/\s+/g, " ").slice(0, 500);
    if (!x || low.has(x.toLowerCase())) continue;
    low.add(x.toLowerCase());
    out.push(x);
  }
  return out.slice(0, LIST_MAX);
}
/** Renames a type or funder on every project that uses it. Returns how many changed. */
export function renameOnProjects(plan: Plan, field: "type" | "funder", from: string, to: string): number {
  let n = 0;
  for (const p of plan.projects)
    if (p[field] === from) {
      if (to) p[field] = to;
      else delete p[field];
      n++;
    }
  return n;
}
/** A random id. v34: falls back when crypto.randomUUID is missing (older Safari, some file:// pages). */
export const uid = (): string => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export const clone = <T>(data: T): T => structuredClone(data);
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDate(s: string): Date {
  return new Date(`${s}T12:00:00`);
}
export function monday(input: string | Date = new Date()): string {
  const d = typeof input === "string" ? parseDate(input) : new Date(input);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}
export function addWeeks(week: string, count: number): string {
  const d = parseDate(week);
  d.setDate(d.getDate() + count * 7);
  return dateKey(d);
}
export function weekLabel(week: string, full = false): string {
  const d = parseDate(week);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(full ? { year: "numeric" as const } : {}),
  });
}
export function capacityFor(
  plan: Plan,
  personId: string,
  week: string,
): number | null {
  const override = plan.capacityOverrides.find(
    (o) => o.personId === personId && o.week === week,
  );
  if (override) return override.hours;
  const person = plan.people.find((p) => p.id === personId);
  return person?.capacityHours == null
    ? null
    : Math.max(0, person.capacityHours - person.reservedHours);
}
export function personLoad(plan: Plan, personId: string, week: string) {
  // v34: work on finished or rejected projects no longer counts, the same rule as involvement (countsNow).
  const assignments = plan.assignments.filter(
    (a) => a.personId === personId && countsNow(plan, a),
  );
  const ids = new Set(assignments.map((a) => a.id));
  const alloc = plan.allocations.filter(
    (a) => a.week === week && ids.has(a.assignmentId),
  );
  const committed = alloc
    .filter(
      (a) =>
        assignments.find((x) => x.id === a.assignmentId)?.status === "ongoing",
    )
    .reduce((s, a) => s + a.hours, 0);
  const tentative = alloc
    .filter(
      (a) =>
        assignments.find((x) => x.id === a.assignmentId)?.status === "planned",
    )
    .reduce((s, a) => s + a.hours, 0);
  const capacity = capacityFor(plan, personId, week);
  const total = committed + tentative;
  const missing = assignments.filter((a) => !a.estimated).length;
  return {
    committed,
    tentative,
    total,
    capacity,
    missing,
    remaining: capacity == null ? null : capacity - total,
    utilisation: capacity == null || capacity === 0 ? null : total / capacity,
    over: capacity != null && total > capacity,
  };
}
export function assignmentCounts(plan: Plan, personId?: string) {
  const list = personId
    ? plan.assignments.filter((a) => a.personId === personId)
    : plan.assignments;
  const ongoing = list.filter((a) => a.status === "ongoing").length;
  const planned = list.filter((a) => a.status === "planned").length;
  const finished = list.filter((a) => a.status === "finished").length;
  return {
    ongoing,
    planned,
    finished,
    active: ongoing + planned,
    total: list.length,
  };
}
export function setAllocation(
  plan: Plan,
  assignmentId: string,
  start: string,
  end: string,
  hours: number,
  note?: string,
): Plan {
  if (!Number.isFinite(hours) || hours < 0 || hours > 168)
    throw new Error("Enter hours between 0 and 168.");
  if (
    !validDate(start) ||
    !validDate(end) ||
    start !== monday(start) ||
    end !== monday(end) ||
    start > end
  )
    throw new Error("Choose a valid week range.");
  const distance =
    (parseDate(end).getTime() - parseDate(start).getTime()) / 86400000;
  if (distance > 366 * 5) throw new Error("Plan up to five years at a time.");
  const out = clone(plan);
  const assignment = out.assignments.find((a) => a.id === assignmentId);
  if (!assignment || assignment.status === "finished")
    throw new Error("Choose an ongoing or planned assignment.");
  for (let week = start; week <= end; week = addWeeks(week, 1)) {
    out.allocations = out.allocations.filter(
      (a) => a.assignmentId !== assignmentId || a.week !== week,
    );
    out.allocations.push(
      note && note.trim()
        ? { id: uid(), assignmentId, week, hours, note: note.trim() }
        : { id: uid(), assignmentId, week, hours },
    );
  }
  assignment.estimated = true;
  return out;
}
function validDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(parseDate(s).getTime()) &&
    dateKey(parseDate(s)) === s
  );
}
function bounded(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 168;
}
export function validatePlan(value: unknown): Plan {
  if (!value || typeof value !== "object")
    throw new Error("The backup is not a valid plan.");
  const p = value as Plan;
  if (
    p.version !== 1 ||
    !Array.isArray(p.people) ||
    !Array.isArray(p.projects) ||
    !Array.isArray(p.assignments) ||
    !Array.isArray(p.allocations) ||
    !Array.isArray(p.capacityOverrides) ||
    !p.settings ||
    ![4, 8, 12].includes(p.settings.weekCount) ||
    typeof p.source !== "string"
  )
    throw new Error("Unsupported or incomplete backup.");
  const validId = (s: unknown) =>
    typeof s === "string" && s.length > 0 && s.length < 200;
  const validName = (s: unknown) =>
    typeof s === "string" && s.trim().length > 0 && s.length <= 500;
  const validNotes = (s: unknown) => typeof s === "string" && s.length <= 10000;
  for (const list of [p.people, p.projects, p.assignments, p.allocations]) {
    if (
      list.length > 100000 ||
      list.some((x) => !x || !validId(x.id)) ||
      new Set(list.map((x) => x.id)).size !== list.length
    )
      throw new Error("Invalid or duplicate record IDs.");
  }
  if (
    p.people.some(
      (x) =>
        !validName(x.name) ||
        !validNotes(x.notes) ||
        (x.capacityHours !== null && !bounded(x.capacityHours)) ||
        !bounded(x.reservedHours) ||
        (x.capacityHours != null && x.reservedHours > x.capacityHours),
    )
  )
    throw new Error("Invalid person capacity or name.");
  const optText = (s: unknown, max = 500) =>
    s === undefined || (typeof s === "string" && s.length <= max);
  const optYear = (y: unknown) =>
    y === undefined ||
    y === null ||
    (typeof y === "number" && Number.isInteger(y) && y >= 1900 && y <= 2200);
  if (
    p.people.some(
      (x) =>
        !optText(x.role) ||
        !optText(x.statusNote) ||
        !validPercent(x.fullAt) ||
        (x.photo !== undefined && !isPhoto(x.photo)) ||
        (x.status !== undefined && !personStatuses.includes(x.status)),
    )
  )
    throw new Error("Invalid person role, status or photo.");
  if (
    (p.settings.capacityTracking !== undefined &&
      typeof p.settings.capacityTracking !== "boolean") ||
    (p.settings.overloadPercent !== undefined &&
      !(typeof p.settings.overloadPercent === "number" && p.settings.overloadPercent >= 10 && p.settings.overloadPercent <= PERCENT_MAX))
  )
    throw new Error("Invalid settings.");
  const periodIds = new Set((p.settings.periods ?? []).map((x) => x?.id));
  if (
    p.settings.periods !== undefined &&
    (!Array.isArray(p.settings.periods) ||
      p.settings.periods.length > 100 ||
      p.settings.periods.some(
        (x) => !x || !validId(x.id) || !validName(x.name) || !validDate(x.start) || !validDate(x.end) || x.start > x.end,
      ) ||
      periodIds.size !== p.settings.periods.length)
  )
    throw new Error("Invalid teaching periods: each needs a name and an end on or after its start.");
  const strList = (xs: unknown) =>
    xs === undefined ||
    (Array.isArray(xs) && xs.length <= LIST_MAX && xs.every((x) => typeof x === "string" && x.trim() && x.length <= 500));
  if (!strList(p.settings.projectTypes) || !strList(p.settings.funders))
    throw new Error("Invalid list of project types or funders.");
  const sd = p.settings.stages;
  if (
    sd !== undefined &&
    (!Array.isArray(sd) ||
      sd.length > LIST_MAX ||
      new Set(sd.map((d) => d?.id)).size !== sd.length ||
      sd.some(
        (d) =>
          !d ||
          !validId(d.id) ||
          typeof d.label !== "string" ||
          d.label.length > 80 ||
          (d.hidden !== undefined && typeof d.hidden !== "boolean") ||
          ((projectStatuses as string[]).includes(d.id)
            ? d.like !== undefined
            : !d.like || !projectStatuses.includes(d.like) || !d.label.trim()),
      ))
  )
    throw new Error("Invalid list of stages.");
  if (
    p.projects.some((x) => {
      const sc = x.schedule;
      if (sc === undefined) return false;
      if (!sc || typeof sc !== "object") return true;
      if (!["periods", "span", "once", "recurring", "event", "range"].includes(sc.mode)) return true;
      if (sc.start !== undefined && !validDate(sc.start)) return true;
      if (sc.end !== undefined && !validDate(sc.end)) return true;
      if (sc.start && sc.end && sc.start > sc.end) return true;
      if ((sc.from !== undefined && !validTime(sc.from)) || (sc.to !== undefined && !validTime(sc.to))) return true;
      if (sc.from && sc.to && (sc.mode !== "range" || sc.start === (sc.end ?? sc.start)) && sc.to <= sc.from) return true;
      if (sc.freq !== undefined && sc.freq !== "weekly" && sc.freq !== "monthly") return true;
      if (sc.interval !== undefined && !(Number.isInteger(sc.interval) && sc.interval >= 1 && sc.interval <= 52)) return true;
      if (sc.weekdays !== undefined && (!Array.isArray(sc.weekdays) || sc.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))) return true;
      if (sc.variableDays !== undefined && typeof sc.variableDays !== "boolean") return true;
      if (sc.weekHours !== undefined && !(typeof sc.weekHours === "number" && Number.isFinite(sc.weekHours) && sc.weekHours > 0 && sc.weekHours <= 80)) return true;
      if (sc.periodIds !== undefined && (!Array.isArray(sc.periodIds) || sc.periodIds.some((id) => !periodIds.has(id)))) return true;
      return false;
    })
  )
    throw new Error("Invalid activity schedule: check dates, times (end after start) and teaching periods.");
  if (p.profile !== undefined) {
    const pr = p.profile as Record<string, unknown>;
    const badText = (k: keyof typeof PROFILE_LIMITS) =>
      pr[k] !== undefined && (typeof pr[k] !== "string" || (pr[k] as string).length > PROFILE_LIMITS[k]);
    if (
      !pr ||
      typeof pr !== "object" ||
      Array.isArray(pr) ||
      (Object.keys(PROFILE_LIMITS) as (keyof typeof PROFILE_LIMITS)[]).some(badText) ||
      (pr.leadId !== undefined && typeof pr.leadId !== "string") ||
      (pr.coordinatorId !== undefined && typeof pr.coordinatorId !== "string") ||
      (pr.focus !== undefined &&
        (!Array.isArray(pr.focus) || pr.focus.length > 30 || pr.focus.some((x) => typeof x !== "string" || x.length > 100)))
    )
      throw new Error("Invalid team profile.");
  }
  if (p.taskLibrary !== undefined) {
    if (
      !Array.isArray(p.taskLibrary) ||
      p.taskLibrary.length > 500 ||
      p.taskLibrary.some(
        (t) =>
          !t ||
          !validId(t.id) ||
          !validName(t.name) ||
          !optText(t.category) ||
          (t.color !== undefined && !TASK_COLORS.includes(t.color)),
      ) ||
      new Set(p.taskLibrary.map((t) => t.id)).size !== p.taskLibrary.length
    )
      throw new Error("Invalid task library.");
  }
  const items = p.workItems ?? [];
  if (p.workItems !== undefined) {
    if (
      !Array.isArray(p.workItems) ||
      p.workItems.length > 2000 ||
      p.workItems.some(
        (w) =>
          !w ||
          !validId(w.id) ||
          !validName(w.name) ||
          !workStatuses.includes(w.status) ||
          !optText(w.note, 1000) ||
          (w.waitsOn !== undefined &&
            (!Array.isArray(w.waitsOn) || w.waitsOn.length > 50)) ||
          [w.links, w.waitsOnProjects].some(
            (l) =>
              l !== undefined &&
              (!Array.isArray(l) ||
                l.length > 100 ||
                l.some(
                  (r) =>
                    !r ||
                    !p.projects.some((x) => x.id === r.projectId) ||
                    (r.taskId !== undefined && !validId(r.taskId)),
                )),
          ),
      ) ||
      new Set(p.workItems.map((w) => w.id)).size !== p.workItems.length
    )
      throw new Error("Invalid shared work items.");
    const ids = new Set(items.map((w) => w.id));
    if (
      items.some((w) =>
        (w.waitsOn ?? []).some(
          (id) =>
            !ids.has(id) ||
            wouldLoop(
              items.map((x) => (x.id === w.id ? { ...x, waitsOn: [] } : x)),
              w.id,
              id,
            ),
        ),
      )
    )
      throw new Error("A shared work item waits on a missing item or on itself.");
  }
  const itemIds = new Set(items.map((w) => w.id));
  if (
    p.projects.some(
      (x) =>
        (x.kind !== undefined && !kinds.includes(x.kind)) ||
        !optText(x.type) ||
        !optText(x.funder) ||
        !optText(x.centre) ||
        (x.abbreviation !== undefined && (typeof x.abbreviation !== "string" || x.abbreviation.length > PROJECT_ABBR_MAX)) ||
        !optText(x.fullTitle, 1000) ||
        (x.stage !== undefined &&
          !(Array.isArray(p.settings.stages) && p.settings.stages.some((d) => d && d.id === x.stage && d.like))) ||
        !optText(x.description, 10000) ||
        !optYear(x.startYear) ||
        !optYear(x.endYear) ||
        (x.startYear != null && x.endYear != null && x.startYear > x.endYear) ||
        (x.taskGroups !== undefined &&
          (!Array.isArray(x.taskGroups) || x.taskGroups.length > 100 || x.taskGroups.some((g) => !validId(g)))) ||
        (x.piId !== undefined && !validId(x.piId)),
    )
  )
    throw new Error("Invalid project details.");
  if (
    p.projects.some(
      (x) =>
        x.roles !== undefined &&
        (!Array.isArray(x.roles) ||
          x.roles.length > ROLES_MAX ||
          x.roles.some(
            (r) =>
              !r ||
              typeof r !== "object" ||
              typeof r.role !== "string" ||
              !r.role.trim() ||
              r.role.length > ROLE_TEXT_MAX ||
              (r.personId !== undefined && !validId(r.personId)) ||
              (r.name !== undefined && (typeof r.name !== "string" || r.name.length > ROLE_TEXT_MAX)) ||
              (!r.personId && !(r.name ?? "").trim()),
          )),
    )
  )
    throw new Error("Invalid activity roles: each needs a role name and a person.");
  if (
    p.projects.some(
      (x) =>
        x.milestones !== undefined &&
        (!Array.isArray(x.milestones) ||
          x.milestones.length > MILESTONES_MAX ||
          new Set(x.milestones.map((m) => m?.id)).size !== x.milestones.length ||
          x.milestones.some(
            (m) =>
              !m ||
              typeof m !== "object" ||
              !validId(m.id) ||
              !milestoneKinds.includes(m.kind) ||
              typeof m.title !== "string" ||
              !m.title.trim() ||
              m.title.length > MILESTONE_TITLE_MAX ||
              !validDate(m.date) ||
              !optText(m.note, 2000) ||
              (m.movedFrom !== undefined && !validDate(m.movedFrom)) ||
              (m.originalDate !== undefined && !validDate(m.originalDate)) ||
              (m.movedOn !== undefined && !validDate(m.movedOn)) ||
              (m.done !== undefined && typeof m.done !== "boolean"),
          )),
    )
  )
    throw new Error("Invalid milestone or deadline: each needs a title and a date.");
  const optDate = (v: unknown) => v === undefined || validDate(v);
  if (
    p.projects.some((x) => {
      const d = x.dates;
      if (d !== undefined) {
        if (typeof d !== "object" || d === null) return true;
        if (Object.values(d).some((v) => !optDate(v))) return true;
        if (d.appStart && d.appDue && d.appStart > d.appDue) return true;
        if (d.plannedStart && d.plannedEnd && d.plannedStart > d.plannedEnd) return true;
        if (d.start && d.end && d.start > d.end) return true;
      }
      if (x.extensions !== undefined) {
        if (!Array.isArray(x.extensions) || x.extensions.length > 50) return true;
        let prev = d?.end ?? "";
        for (const e of x.extensions) {
          if (!e || !validId(e.id) || !validDate(e.end) || !optText(e.note) || !optDate(e.approvedOn))
            return true;
          if (e.end <= prev) return true;
          prev = e.end;
        }
      }
      if (x.dateLog !== undefined)
        if (
          !Array.isArray(x.dateLog) ||
          x.dateLog.length > 1000 ||
          x.dateLog.some(
            (c) => !c || !validDate(c.on) || !optText(c.field, 80) || !optText(c.from, 80) || !optText(c.to, 80) || !optText(c.note),
          )
        )
          return true;
      return false;
    })
  )
    throw new Error("Invalid project dates: check that each end is after its start and extensions run later.");
  if (
    p.projects.some(
      (x) =>
        !validName(x.name) ||
        !validNotes(x.notes) ||
        !projectStatuses.includes(x.status),
    )
  )
    throw new Error("Invalid project.");
  const people = new Set(p.people.map((x) => x.id)),
    projects = new Set(p.projects.map((x) => x.id));
  if (
    p.assignments.some(
      (x) =>
        !people.has(x.personId) ||
        !projects.has(x.projectId) ||
        !statuses.includes(x.status) ||
        typeof x.estimated !== "boolean" ||
        !validNotes(x.notes) ||
        !validPercent(x.percent) ||
        (x.tasks !== undefined &&
          (!Array.isArray(x.tasks) ||
            x.tasks.length > 50 ||
            x.tasks.some(
              (t) =>
                !t ||
                !validId(t.taskId) ||
                !optText(t.note) ||
                (t.workItemId !== undefined && !itemIds.has(t.workItemId)) ||
                !validPercent(t.percent) ||
                (t.items !== undefined &&
                  (!Array.isArray(t.items) ||
                    t.items.length > ITEMS_MAX ||
                    t.items.some(
                      (i) =>
                        !i ||
                        !validId(i.id) ||
                        typeof i.text !== "string" ||
                        !i.text.trim() ||
                        i.text.length > ITEM_TEXT_MAX ||
                        (i.done !== undefined && typeof i.done !== "boolean"),
                    ))),
            ))),
    )
  )
    throw new Error("An assignment references a missing person or project.");
  if (
    new Set(p.assignments.map((x) => `${x.personId}\0${x.projectId}`)).size !==
    p.assignments.length
  )
    throw new Error("Duplicate person/project assignments.");
  const assignments = new Set(p.assignments.map((x) => x.id));
  if (
    p.allocations.some(
      (x) =>
        !assignments.has(x.assignmentId) ||
        !validDate(x.week) ||
        monday(x.week) !== x.week ||
        !bounded(x.hours) ||
        !optText(x.note),
    )
  )
    throw new Error("Invalid weekly allocation.");
  if (
    new Set(p.allocations.map((x) => `${x.assignmentId}\0${x.week}`)).size !==
    p.allocations.length
  )
    throw new Error("Duplicate weekly allocations.");
  if (
    p.capacityOverrides.length > 100000 ||
    p.capacityOverrides.some(
      (x) =>
        !x ||
        !people.has(x.personId) ||
        !validDate(x.week) ||
        monday(x.week) !== x.week ||
        !bounded(x.hours) ||
        !optText(x.note),
    )
  )
    throw new Error("Invalid capacity adjustment.");
  if (
    new Set(p.capacityOverrides.map((x) => `${x.personId}\0${x.week}`)).size !==
    p.capacityOverrides.length
  )
    throw new Error("Duplicate capacity adjustments.");
  if (
    p.conflicts !== undefined &&
    (!Array.isArray(p.conflicts) ||
      p.conflicts.length > CONFLICTS_MAX ||
      p.conflicts.some(
        (c) =>
          !c ||
          typeof c !== "object" ||
          !validId(c.id) ||
          typeof c.at !== "string" ||
          typeof c.kind !== "string" ||
          typeof c.recordId !== "string" ||
          typeof c.label !== "string" ||
          typeof c.what !== "string",
      ))
  )
    throw new Error("Invalid list of merge conflicts.");
  return clone(p);
}

/**
 * Put everyone in the team on a project or activity in one step. People already on it are left
 * as they are. New assignments are Ongoing when the work is running, otherwise Planned, and start
 * without hours. Returns how many people were added.
 */
export function addWholeTeam(plan: Plan, projectId: string): number {
  const project = plan.projects.find((x) => x.id === projectId);
  if (!project) throw new Error("Unknown project.");
  const on = new Set(plan.assignments.filter((a) => a.projectId === projectId).map((a) => a.personId));
  const status: Status = project.status === "ongoing" || project.status === "granted" ? "ongoing" : "planned";
  let n = 0;
  plan.people.forEach((person) => {
    if (on.has(person.id)) return;
    plan.assignments.push({ id: uid(), personId: person.id, projectId, status, estimated: false, notes: "" });
    n++;
  });
  return n;
}

/** A link made from the assignment dialog: one of this assignment's tasks to a task in another project. */
export interface TaskConnection {
  /** Task in this assignment. */
  taskId: string;
  /** "with": combined work, both tasks share one work item. "waits": this task waits on the other. */
  kind: "with" | "waits";
  projectId: string;
  /** Task in the other project; omitted means the whole project. */
  otherTaskId?: string;
}
const uniqueName = (plan: Plan, base: string) => {
  const taken = new Set(workItemsOf(plan).map((w) => w.name.toLowerCase()));
  let name = base.slice(0, 120),
    i = 2;
  while (taken.has(name.toLowerCase())) name = `${base.slice(0, 114)} (${i++})`;
  return name;
};
/**
 * Store connections as shared work. "with" puts both tasks in one work item: it reuses the item this
 * task already has, else the other side's item, else creates one; other people's matching tasks that
 * are not yet in any item join it, and a task nobody holds yet becomes a link. "waits" adds the other
 * task to the item's waits-on list (creating an item for this task when it has none).
 */
export function applyConnections(plan: Plan, assignmentId: string, conns: TaskConnection[]): void {
  const a = plan.assignments.find((x) => x.id === assignmentId);
  if (!a) throw new Error("Unknown assignment.");
  const lib = taskLibrary(plan);
  const pname = (id: string) => plan.projects.find((x) => x.id === id)?.name ?? "project";
  for (const c of conns) {
    if (!plan.projects.some((x) => x.id === c.projectId)) throw new Error("Pick a project for each connection.");
    if (c.projectId === a.projectId) throw new Error("Connect to a task in another project.");
    const t = (a.tasks ?? []).find((x) => x.taskId === c.taskId);
    if (!t) throw new Error("Each connection needs one of this assignment's tasks.");
    const tname = lib.find((x) => x.id === c.taskId)?.name ?? "Task";
    const items = (plan.workItems = workItemsOf(plan));
    let w = t.workItemId ? items.find((x) => x.id === t.workItemId) : undefined;
    const others = plan.assignments.filter(
      (x) => x.projectId === c.projectId && x.id !== a.id && c.otherTaskId && (x.tasks ?? []).some((y) => y.taskId === c.otherTaskId),
    );
    const otherTasks = others.map((x) => x.tasks!.find((y) => y.taskId === c.otherTaskId)!);
    if (!w && c.kind === "with") {
      const theirs = otherTasks.map((y) => y.workItemId).find((id) => id && items.some((x) => x.id === id));
      if (theirs) w = items.find((x) => x.id === theirs);
    }
    if (!w) {
      const otherName = c.otherTaskId ? lib.find((x) => x.id === c.otherTaskId)?.name : undefined;
      const base =
        c.kind === "with"
          ? `${tname} · ${pname(a.projectId)} + ${pname(c.projectId)}`
          : `${tname} in ${pname(a.projectId)}`;
      w = { id: `w-${uid().slice(0, 8)}`, name: uniqueName(plan, base), status: "active" };
      if (c.kind === "with" && otherName && otherName !== tname) w.note = `${tname} with ${otherName}`;
      items.push(w);
    }
    t.workItemId = w.id;
    if (c.kind === "with") {
      let joined = false;
      otherTasks.forEach((y) => {
        if (!y.workItemId || y.workItemId === w!.id) {
          y.workItemId = w!.id;
          joined = true;
        }
      });
      const inItem = workItemParts(plan, w.id).some(
        (p) => p.projectId === c.projectId && (!c.otherTaskId || p.taskId === c.otherTaskId),
      );
      if (!joined && !inItem) {
        const link: WorkLink = c.otherTaskId ? { projectId: c.projectId, taskId: c.otherTaskId } : { projectId: c.projectId };
        w.links = [...(w.links ?? []), link];
      }
    } else {
      const ref: ProjectRef = c.otherTaskId ? { projectId: c.projectId, taskId: c.otherTaskId } : { projectId: c.projectId };
      const list = w.waitsOnProjects ?? [];
      if (!list.some((r) => r.projectId === ref.projectId && r.taskId === ref.taskId)) w.waitsOnProjects = [...list, ref];
    }
  }
}

/** Key of a map node: a project, or one task in it. */
export const refKey = (r: ProjectRef) => `${r.projectId}|${r.taskId ?? ""}`;
export const keyRef = (k: string): ProjectRef => {
  const [projectId, taskId] = k.split("|");
  return taskId ? { projectId, taskId } : { projectId };
};
export interface MapEdge {
  kind: "with" | "waits";
  /** Node keys. For "waits", from waits on to. */
  from: string;
  to: string;
  /** The work item the edge belongs to (for "waits", the one that waits). */
  itemId: string;
  /** For "waits": the project or task waited on, or the work item waited on. */
  ref?: ProjectRef;
  onItemId?: string;
}
export interface DependencyGraph {
  /** Project ids, ordered so linked projects sit next to each other. */
  projects: string[];
  /** Node keys per project, project node first. */
  nodes: Record<string, string[]>;
  edges: MapEdge[];
}
/** Shared work as a graph: projects as columns, tasks as nodes, combined work and waits-on as edges. */
export function dependencyGraph(plan: Plan, includeDone: boolean, extra: string[] = []): DependencyGraph {
  const known = new Set(plan.projects.map((p) => p.id));
  const keys = new Set<string>();
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (e: MapEdge) => {
    const id = `${e.kind}:${e.itemId}:${e.kind === "with" ? [e.from, e.to].sort().join(">") : `${e.from}>${e.to}`}`;
    if (seen.has(id) || e.from === e.to) return;
    seen.add(id);
    edges.push(e);
  };
  const items = workItemsOf(plan).filter((w) => includeDone || w.status !== "done");
  const nodesOf = (id: string) =>
    [...new Set(workItemParts(plan, id).filter((p) => known.has(p.projectId)).map((p) => refKey(p)))];
  for (const w of items) {
    const ns = nodesOf(w.id);
    ns.forEach((k) => keys.add(k));
    for (let i = 0; i < ns.length; i++)
      for (let j = i + 1; j < ns.length; j++)
        if (keyRef(ns[i]).projectId !== keyRef(ns[j]).projectId)
          addEdge({ kind: "with", from: ns[i], to: ns[j], itemId: w.id });
    for (const r of w.waitsOnProjects ?? []) {
      if (!known.has(r.projectId)) continue;
      const to = refKey(r);
      keys.add(to);
      const from = ns.filter((k) => keyRef(k).projectId !== r.projectId);
      from.forEach((f) => addEdge({ kind: "waits", from: f, to, itemId: w.id, ref: r }));
    }
    for (const oid of w.waitsOn ?? []) {
      const other = workItemsOf(plan).find((x) => x.id === oid);
      if (!other) continue;
      const tos = nodesOf(oid);
      if (!ns.length || !tos.length) continue;
      tos.forEach((k) => keys.add(k));
      addEdge({ kind: "waits", from: ns[0], to: tos[0], itemId: w.id, onItemId: oid });
    }
  }
  extra.forEach((k) => known.has(keyRef(k).projectId) && keys.add(k));
  // Every project with a node also gets its project node (the column header).
  const byProject: Record<string, string[]> = {};
  keys.forEach((k) => {
    const pid = keyRef(k).projectId;
    (byProject[pid] ??= []).push(k);
  });
  const lib = taskLibrary(plan);
  const rank = (k: string) => {
    const t = keyRef(k).taskId;
    if (!t) return -1;
    const i = lib.findIndex((x) => x.id === t);
    return i < 0 ? 999 : i;
  };
  Object.keys(byProject).forEach((pid) => {
    const head = `${pid}|`;
    const list = [...new Set([head, ...byProject[pid]])];
    byProject[pid] = list.sort((a, b) => rank(a) - rank(b));
  });
  // Order columns greedily: start with the most linked project, then keep adding the one most linked to the last.
  const weight = (a: string, b: string) =>
    edges.filter((e) => {
      const p = keyRef(e.from).projectId,
        q = keyRef(e.to).projectId;
      return (p === a && q === b) || (p === b && q === a);
    }).length;
  const degree = (p: string) => edges.filter((e) => keyRef(e.from).projectId === p || keyRef(e.to).projectId === p).length;
  const name = (p: string) => plan.projects.find((x) => x.id === p)?.name ?? "";
  const rest = Object.keys(byProject).sort((a, b) => degree(b) - degree(a) || name(a).localeCompare(name(b)));
  const order: string[] = [];
  while (rest.length) {
    const last = order[order.length - 1];
    let pick = 0;
    if (last) {
      let best = -1;
      rest.forEach((p, i) => {
        const w = weight(last, p);
        if (w > best) {
          best = w;
          pick = i;
        }
      });
    }
    order.push(rest.splice(pick, 1)[0]);
  }
  // Draw less: combined work links each box to the next one by column, and a waits-on arrow leaves from the
  // item's box nearest to what it waits on. Hover and focus still show the whole item.
  const colOf = (k: string) => order.indexOf(keyRef(k).projectId);
  const shown: MapEdge[] = [];
  const done = new Set<string>();
  for (const e of edges) {
    if (e.kind === "with") {
      if (done.has(e.itemId)) continue;
      done.add(e.itemId);
      const ns = [...new Set(edges.filter((x) => x.kind === "with" && x.itemId === e.itemId).flatMap((x) => [x.from, x.to]))].sort(
        (a, b) => colOf(a) - colOf(b),
      );
      for (let i = 1; i < ns.length; i++)
        if (colOf(ns[i - 1]) !== colOf(ns[i])) shown.push({ kind: "with", from: ns[i - 1], to: ns[i], itemId: e.itemId });
        else if (i > 1) shown.push({ kind: "with", from: ns[i - 2], to: ns[i], itemId: e.itemId });
    } else {
      const key = `${e.itemId}>${e.to}`;
      if (done.has(key)) continue;
      done.add(key);
      const froms = edges.filter((x) => x.kind === "waits" && x.itemId === e.itemId && x.to === e.to).map((x) => x.from);
      const best = froms.sort((a, b) => Math.abs(colOf(a) - colOf(e.to)) - Math.abs(colOf(b) - colOf(e.to)))[0];
      shown.push({ ...e, from: best });
    }
  }
  return { projects: order, nodes: byProject, edges: shown };
}

/**
 * Connect two projects or tasks from the map. "with": both join one open work item (this side's, else the
 * other side's, else a new one). "waits": a's work item (made when needed) waits on b. People already on a task
 * join through their assignment; a task nobody holds yet becomes a link. Returns the work item id.
 */
export function connectRefs(plan: Plan, a: ProjectRef, b: ProjectRef, kind: "with" | "waits"): string {
  const pa = plan.projects.find((x) => x.id === a.projectId);
  const pb = plan.projects.find((x) => x.id === b.projectId);
  if (!pa || !pb) throw new Error("Unknown project.");
  if (a.projectId === b.projectId) throw new Error("Connect to a task in another project.");
  const lib = taskLibrary(plan);
  const items = (plan.workItems = workItemsOf(plan));
  const has = (w: WorkItem, r: ProjectRef) =>
    workItemParts(plan, w.id).some((p) => p.projectId === r.projectId && (p.taskId ?? "") === (r.taskId ?? ""));
  const open = items.filter((w) => w.status !== "done");
  let w: WorkItem | undefined;
  if (kind === "with") w = open.find((x) => has(x, a) && has(x, b)) ?? open.find((x) => has(x, a)) ?? open.find((x) => has(x, b));
  else w = open.find((x) => has(x, a));
  if (!w) {
    const tname = a.taskId ? lib.find((x) => x.id === a.taskId)?.name : undefined;
    const base = kind === "with" ? `${tname ?? pa.name} · ${pa.name} + ${pb.name}` : refLabel(plan, a);
    w = { id: `w-${uid().slice(0, 8)}`, name: uniqueName(plan, base), status: "active" };
    const oname = b.taskId ? lib.find((x) => x.id === b.taskId)?.name : undefined;
    if (kind === "with" && tname && oname && oname !== tname) w.note = `${tname} with ${oname}`;
    items.push(w);
  }
  const item = w;
  const join = (r: ProjectRef) => {
    if (has(item, r)) return;
    let joined = false;
    if (r.taskId)
      plan.assignments
        .filter((x) => x.projectId === r.projectId)
        .forEach((x) =>
          (x.tasks ?? []).forEach((t) => {
            if (t.taskId === r.taskId && !t.workItemId) {
              t.workItemId = item.id;
              joined = true;
            }
          }),
        );
    if (!joined) item.links = [...(item.links ?? []), r.taskId ? { projectId: r.projectId, taskId: r.taskId } : { projectId: r.projectId }];
  };
  join(a);
  if (kind === "with") join(b);
  else {
    const list = item.waitsOnProjects ?? [];
    if (!list.some((r) => r.projectId === b.projectId && (r.taskId ?? "") === (b.taskId ?? "")))
      item.waitsOnProjects = [...list, b.taskId ? { projectId: b.projectId, taskId: b.taskId } : { projectId: b.projectId }];
  }
  return item.id;
}
/** Remove a waits-on edge drawn on the map. */
export function removeWait(plan: Plan, e: MapEdge): void {
  const w = workItemsOf(plan).find((x) => x.id === e.itemId);
  if (!w) return;
  if (e.onItemId) w.waitsOn = (w.waitsOn ?? []).filter((x) => x !== e.onItemId);
  if (e.ref) {
    const r = e.ref;
    w.waitsOnProjects = (w.waitsOnProjects ?? []).filter((x) => !(x.projectId === r.projectId && (x.taskId ?? "") === (r.taskId ?? "")));
  }
  if (w.waitsOn && !w.waitsOn.length) delete w.waitsOn;
  if (w.waitsOnProjects && !w.waitsOnProjects.length) delete w.waitsOnProjects;
}
/** Take one project or task out of a work item: its people leave the item and a direct link is dropped. */
export function leaveWorkItem(plan: Plan, itemId: string, r: ProjectRef): void {
  const w = workItemsOf(plan).find((x) => x.id === itemId);
  if (!w) return;
  plan.assignments
    .filter((x) => x.projectId === r.projectId)
    .forEach((x) =>
      (x.tasks ?? []).forEach((t) => {
        if (t.workItemId === itemId && (!r.taskId || t.taskId === r.taskId)) delete t.workItemId;
      }),
    );
  w.links = (w.links ?? []).filter((l) => !(l.projectId === r.projectId && (!r.taskId || l.taskId === r.taskId)));
  if (!w.links.length) delete w.links;
}

/** Tick a concrete task as finished, or reopen it. */
export function toggleTaskItem(plan: Plan, assignmentId: string, taskId: string, itemId: string): boolean {
  const t = plan.assignments.find((a) => a.id === assignmentId)?.tasks?.find((x) => x.taskId === taskId);
  const it = t?.items?.find((i) => i.id === itemId);
  if (!it) return false;
  if (it.done) delete it.done;
  else it.done = true;
  return !!it.done;
}

export interface DiffLine {
  kind: "add" | "remove" | "change";
  text: string;
}
const q = (s: string) => `"${s.length > 60 ? s.slice(0, 58) + "…" : s}"`;
/** What saving `next` over an existing assignment changes, in plain lines (empty when nothing changes). */
export function assignmentDiff(
  plan: Plan,
  old: Assignment,
  next: { status: Status; notes: string; tasks: AssignmentTask[]; percent?: number },
): DiffLine[] {
  const lib = taskLibrary(plan);
  const tname = (id: string) => lib.find((x) => x.id === id)?.name ?? "Task";
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const out: DiffLine[] = [];
  if (old.status !== next.status) out.push({ kind: "change", text: `Status: ${cap(old.status)} to ${cap(next.status)}` });
  const on = (old.notes ?? "").trim(),
    nn = (next.notes ?? "").trim();
  if (on !== nn)
    out.push(
      !on
        ? { kind: "add", text: `Note added: ${q(nn)}` }
        : !nn
          ? { kind: "remove", text: `Note removed: ${q(on)}` }
          : { kind: "change", text: `Note: ${q(on)} to ${q(nn)}` },
    );
  if ("percent" in next && old.percent !== next.percent)
    out.push(
      old.percent === undefined
        ? { kind: "add", text: `Involvement ${next.percent}%` }
        : next.percent === undefined
          ? { kind: "remove", text: `Involvement ${old.percent}%` }
          : { kind: "change", text: `Involvement: ${old.percent}% to ${next.percent}%` },
    );
  const ot = old.tasks ?? [],
    nt = next.tasks;
  const items = (t?: AssignmentTask) => t?.items ?? [];
  for (const t of nt)
    if (!ot.some((x) => x.taskId === t.taskId)) {
      const n = items(t).length;
      out.push({ kind: "add", text: `Task group ${tname(t.taskId)}${n ? ` with ${n} detailed ${n === 1 ? "task" : "tasks"}` : ""}` });
    }
  for (const t of ot)
    if (!nt.some((x) => x.taskId === t.taskId)) {
      const n = items(t).length;
      const extra = [
        n ? `its ${n} detailed ${n === 1 ? "task" : "tasks"}` : "",
        t.workItemId ? `its shared work link (${workItemsOf(plan).find((w) => w.id === t.workItemId)?.name ?? "shared work"})` : "",
      ].filter(Boolean);
      out.push({ kind: "remove", text: `Task group ${tname(t.taskId)}${extra.length ? ` and ${extra.join(" and ")}` : ""}` });
    }
  for (const t of nt) {
    const o = ot.find((x) => x.taskId === t.taskId);
    if (!o) continue;
    const g = tname(t.taskId);
    if ((o.note ?? "") !== (t.note ?? ""))
      out.push({ kind: "change", text: `${g} note: ${o.note ? q(o.note) : "none"} to ${t.note ? q(t.note) : "none"}` });
    if ((o.workItemId ?? "") !== (t.workItemId ?? "")) {
      const nm = (id?: string) => (id ? workItemsOf(plan).find((w) => w.id === id)?.name ?? "new shared work" : "none");
      out.push({ kind: "change", text: `${g} shared work: ${nm(o.workItemId)} to ${nm(t.workItemId)}` });
    }
    const oi = items(o),
      ni = items(t);
    const key = (i: TaskItem) => i.text.trim().toLowerCase();
    ni.filter((i) => !oi.some((x) => key(x) === key(i))).forEach((i) =>
      out.push({ kind: "add", text: `${g}: ${q(i.text)}` }),
    );
    oi.filter((i) => !ni.some((x) => key(x) === key(i))).forEach((i) =>
      out.push({ kind: "remove", text: `${g}: ${q(i.text)}${i.done ? " (done)" : ""}` }),
    );
    ni.forEach((i) => {
      const was = oi.find((x) => key(x) === key(i));
      if (was && !!was.done !== !!i.done) out.push({ kind: "change", text: `${g}: ${q(i.text)} ${i.done ? "marked done" : "open again"}` });
    });
  }
  return out;
}

/* ------------------------------------------- Analytics builder (v29) */

export type AnMeasure = "involvement" | "assignments" | "projects" | "people" | "tasks" | "openItems";
export type AnGroup = "person" | "project" | "kind" | "funder" | "centre" | "stage" | "role" | "task";
export type AnScope = "all" | "research" | "activities";
export const anMeasureLabels: Record<AnMeasure, string> = {
  involvement: "Involvement %",
  assignments: "Assignments",
  projects: "Projects",
  people: "People",
  tasks: "Task groups",
  openItems: "Open detailed tasks",
};
export const anGroupLabels: Record<AnGroup, string> = {
  person: "Person",
  project: "Project or activity",
  kind: "Type or kind",
  funder: "Funder",
  centre: "Research centre",
  stage: "Project stage",
  role: "Person's role",
  task: "Task group",
};
export interface AnQuery {
  measure: AnMeasure;
  group: AnGroup;
  scope?: AnScope;
  /** Count planned assignments too (default: ongoing only). */
  planned?: boolean;
}
/** One value per group for the analytics builder, highest first. Uses current (not finished) work only. */
export function analyticsData(plan: Plan, q: AnQuery): { key: string; label: string; value: number }[] {
  const lib = taskLibrary(plan);
  const sums = new Map<string, { label: string; value: number; set?: Set<string> }>();
  const distinct = q.measure === "projects" || q.measure === "people";
  const add = (key: string, label: string, value: number, member?: string) => {
    const e = sums.get(key) ?? { label, value: 0, ...(distinct ? { set: new Set<string>() } : {}) };
    if (distinct && member) e.set!.add(member);
    else e.value += value;
    sums.set(key, e);
  };
  for (const a of plan.assignments) {
    if (!countsNow(plan, a)) continue;
    if (a.status === "planned" && !q.planned) continue;
    const p = plan.projects.find((x) => x.id === a.projectId)!;
    const person = plan.people.find((x) => x.id === a.personId);
    if (!person) continue;
    if (q.scope === "research" && isActivity(p)) continue;
    if (q.scope === "activities" && !isActivity(p)) continue;
    const member = q.measure === "projects" ? p.id : person.id;
    const value = (t?: AssignmentTask) => {
      switch (q.measure) {
        case "involvement":
          return t ? t.percent ?? 0 : involvement(a) ?? 0;
        case "assignments":
          return 1;
        case "tasks":
          return t ? 1 : a.tasks?.length ?? 0;
        case "openItems":
          return itemCounts(t ? [t] : a.tasks).open;
        default:
          return 0;
      }
    };
    if (q.group === "task") {
      for (const t of a.tasks ?? []) {
        const name = lib.find((x) => x.id === t.taskId)?.name ?? "Task";
        add(t.taskId, name, value(t), member);
      }
      continue;
    }
    let key: string, label: string;
    switch (q.group) {
      case "person":
        key = person.id;
        label = person.name;
        break;
      case "project":
        key = p.id;
        label = projectLabel(p);
        break;
      case "kind":
        label = isActivity(p) ? kindLabels[kindOf(p)] : p.type?.trim() || "Type not set";
        key = label;
        break;
      case "funder":
        label = isActivity(p) ? "Activities" : p.funder?.trim() || "No funder";
        key = label;
        break;
      case "centre":
        label = isActivity(p) ? "Activities" : p.centre?.trim() || "Not in a centre";
        key = label;
        break;
      case "stage":
        label = projectStageLabel(p);
        key = label;
        break;
      default:
        label = person.role?.trim() || "No role";
        key = label;
    }
    add(key, label, value(), member);
  }
  return [...sums.entries()]
    .map(([key, e]) => ({ key, label: e.label, value: Math.round((e.set ? e.set.size : e.value) * 10) / 10 }))
    .filter((x) => x.value > 0)
    .sort((x, y) => y.value - x.value || x.label.localeCompare(y.label));
}

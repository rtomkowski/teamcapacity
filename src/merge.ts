/*
 * Merge on save (v30). Several people edit their own copy and save to one shared file
 * (OneDrive). Before writing, the app reads the file and merges three versions record by
 * record: the base (what this computer last read or wrote), mine (this computer now) and
 * theirs (the file now). A record changed on one side only takes that side. A record
 * changed differently on both sides keeps this computer's version and sets the other
 * aside in plan.conflicts, so nothing is lost and it can be restored.
 */
import { clone, uid, validatePlan, CONFLICTS_MAX, type MergeConflict, type Plan } from "./model.ts";
import type { TeamWorkspace } from "./teams.ts";

type Rec = Record<string, unknown>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Lists merged by key. Allocations and capacity overrides are keyed by what makes them unique. */
const LISTS: { kind: keyof Plan; key: (x: Rec) => string; label: (x: Rec, plan: Plan) => string }[] = [
  { kind: "people", key: (x) => String(x.id), label: (x) => String(x.name ?? "Person") },
  { kind: "projects", key: (x) => String(x.id), label: (x) => String(x.name ?? "Project") },
  {
    kind: "assignments",
    key: (x) => String(x.id),
    label: (x, p) =>
      `${p.people.find((y) => y.id === x.personId)?.name ?? "Someone"} on ${p.projects.find((y) => y.id === x.projectId)?.name ?? "a project"}`,
  },
  { kind: "allocations", key: (x) => `${x.assignmentId}\u0000${x.week}`, label: (x) => `Hours in week ${x.week}` },
  { kind: "capacityOverrides", key: (x) => `${x.personId}\u0000${x.week}`, label: (x) => `Capacity in week ${x.week}` },
  { kind: "workItems", key: (x) => String(x.id), label: (x) => String(x.name ?? "Shared work") },
  { kind: "taskLibrary", key: (x) => String(x.id), label: (x) => String(x.name ?? "Task") },
];
const SINGLE: (keyof Plan)[] = ["settings", "profile", "source"];

export interface MergeResult<T> {
  merged: T;
  /** Records taken from the file (changed by someone else). */
  fromTheirs: number;
  /** New conflicts set aside. */
  conflicts: MergeConflict[];
}

function mergeList(
  kind: string,
  base: Rec[] | undefined,
  mine: Rec[] | undefined,
  theirs: Rec[] | undefined,
  key: (x: Rec) => string,
  label: (x: Rec) => string,
  out: { conflicts: MergeConflict[]; fromTheirs: number },
  at: string,
): Rec[] | undefined {
  if (mine === undefined && theirs === undefined) return undefined;
  const B = new Map((base ?? []).map((x) => [key(x), x]));
  const M = new Map((mine ?? []).map((x) => [key(x), x]));
  const T = new Map((theirs ?? []).map((x) => [key(x), x]));
  const order = [...M.keys(), ...[...T.keys()].filter((k) => !M.has(k))];
  const result: Rec[] = [];
  const conflict = (k: string, rec: Rec, what: string, data?: unknown) =>
    out.conflicts.push({ id: uid(), at, kind, recordId: k, label: label(rec), what, ...(data !== undefined ? { data: clone(data) } : {}) });
  for (const k of order) {
    const b = B.get(k),
      m = M.get(k),
      t = T.get(k);
    if (m && t) {
      if (same(m, t)) result.push(m);
      else if (b && same(m, b)) {
        result.push(t);
        out.fromTheirs++;
      } else if (b && same(t, b)) result.push(m);
      else {
        // Changed on both sides (or added on both without a base): keep mine, set theirs aside.
        result.push(m);
        conflict(k, m, "changed on both sides", t);
      }
    } else if (m && !t) {
      if (!b) result.push(m); // added here
      else if (same(m, b)) {
        /* removed in the file, unchanged here: remove */
      } else {
        // Removed there, changed here: keep it so the change is not lost.
        result.push(m);
        conflict(k, m, "removed in the shared file but changed here; kept", undefined);
      }
    } else if (!m && t) {
      if (!b) {
        result.push(t); // added there
        out.fromTheirs++;
      } else if (same(t, b)) {
        /* removed here, unchanged there: remove */
      } else {
        // Removed here, changed there: keep their version.
        result.push(t);
        out.fromTheirs++;
        conflict(k, t, "removed here but changed in the shared file; kept", undefined);
      }
    }
  }
  return result;
}

/** Merge one team's plan. Without a base, records present on either side are kept. */
export function mergePlans(base: Plan | undefined, mine: Plan, theirs: Plan, at = new Date().toISOString()): MergeResult<Plan> {
  const out = { conflicts: [] as MergeConflict[], fromTheirs: 0 };
  const merged = clone(mine) as unknown as Rec;
  for (const l of LISTS) {
    const r = mergeList(
      l.kind,
      base?.[l.kind] as Rec[] | undefined,
      mine[l.kind] as Rec[] | undefined,
      theirs[l.kind] as Rec[] | undefined,
      l.key,
      (x) => l.label(x, mine.people.length ? mine : theirs),
      out,
      at,
    );
    if (r === undefined) delete merged[l.kind];
    else merged[l.kind] = r;
  }
  for (const k of SINGLE) {
    const b = base?.[k],
      m = mine[k],
      t = theirs[k];
    if (same(m, t)) continue;
    if (base && same(m, b)) {
      if (t === undefined) delete merged[k];
      else merged[k] = clone(t);
      out.fromTheirs++;
    } else if (base && same(t, b)) continue;
    else if (m === undefined) {
      merged[k] = clone(t);
      out.fromTheirs++;
    } else if (t !== undefined)
      out.conflicts.push({ id: uid(), at, kind: String(k), recordId: String(k), label: k === "settings" ? "Settings" : k === "profile" ? "Team details" : "Source", what: "changed on both sides", data: clone(t) });
  }
  const plan = merged as unknown as Plan;
  // Keep references whole: bring back a person or project an assignment still needs.
  for (const a of [...plan.assignments]) {
    for (const [list, id] of [
      ["people", a.personId],
      ["projects", a.projectId],
    ] as const) {
      const have = (plan[list] as { id: string }[]).some((x) => x.id === id);
      if (have) continue;
      const back = ([theirs, mine, base].map((p) => (p?.[list] as { id: string }[] | undefined)?.find((x) => x.id === id)).find(Boolean));
      if (back) {
        (plan[list] as { id: string }[]).push(clone(back));
        out.conflicts.push({ id: uid(), at, kind: list, recordId: id, label: String((back as { name?: string }).name ?? id), what: "removed on one side but still assigned on the other; kept" });
      } else plan.assignments = plan.assignments.filter((x) => x !== a);
    }
  }
  // Two people may have assigned the same person to the same project: keep the first.
  const seen = new Set<string>();
  plan.assignments = plan.assignments.filter((a) => {
    const k = `${a.personId}\u0000${a.projectId}`;
    if (seen.has(k)) {
      out.conflicts.push({ id: uid(), at, kind: "assignments", recordId: a.id, label: "Duplicate assignment", what: "added on both sides; one kept", data: clone(a) });
      return false;
    }
    seen.add(k);
    return true;
  });
  // Links to shared work, own stages and teaching periods that no longer exist are dropped (the records stay).
  const items = new Set((plan.workItems ?? []).map((w) => w.id));
  plan.assignments.forEach((a) => a.tasks?.forEach((t) => t.workItemId && !items.has(t.workItemId) && delete t.workItemId));
  const stages = new Set((plan.settings.stages ?? []).map((d) => d.id));
  const periods = new Set((plan.settings.periods ?? []).map((d) => d.id));
  plan.projects.forEach((p) => {
    if (p.stage && !stages.has(p.stage)) delete p.stage;
    if (p.schedule?.periodIds) p.schedule.periodIds = p.schedule.periodIds.filter((id) => periods.has(id));
  });
  const asg = new Set(plan.assignments.map((a) => a.id));
  plan.allocations = plan.allocations.filter((x) => asg.has(x.assignmentId));
  const people = new Set(plan.people.map((x) => x.id));
  plan.capacityOverrides = plan.capacityOverrides.filter((x) => people.has(x.personId));
  // Earlier conflicts from both sides, then the new ones; newest first, capped.
  const old = [...(mine.conflicts ?? []), ...(theirs.conflicts ?? []).filter((c) => !(mine.conflicts ?? []).some((x) => x.id === c.id))];
  const all = [...out.conflicts, ...old].slice(0, CONFLICTS_MAX);
  if (all.length) plan.conflicts = all;
  else delete plan.conflicts;
  return { merged: validatePlan(plan), fromTheirs: out.fromTheirs, conflicts: out.conflicts };
}

/** Merge all teams. Teams are matched by id; a team only on one side is kept. */
export function mergeWorkspaces(base: TeamWorkspace | undefined, mine: TeamWorkspace, theirs: TeamWorkspace, at = new Date().toISOString()): MergeResult<TeamWorkspace> {
  let fromTheirs = 0;
  const conflicts: MergeConflict[] = [];
  const teams = [];
  const ids = [...mine.teams.map((t) => t.id), ...theirs.teams.map((t) => t.id).filter((id) => !mine.teams.some((t) => t.id === id))];
  for (const id of ids) {
    const m = mine.teams.find((t) => t.id === id),
      t = theirs.teams.find((x) => x.id === id),
      b = base?.teams.find((x) => x.id === id);
    if (m && t) {
      const r = mergePlans(b?.plan, m.plan, t.plan, at);
      fromTheirs += r.fromTheirs;
      conflicts.push(...r.conflicts);
      teams.push({ id, name: b && m.name === b.name ? t.name : m.name, plan: r.merged });
    } else if (m) {
      // Removed in the file: drop only if this computer did not change it.
      if (!b || !same(m, b)) teams.push(m);
    } else if (t) {
      if (!b || !same(t, b)) {
        teams.push(t);
        fromTheirs++;
      }
    }
  }
  // Team names must stay unique.
  const names = new Set<string>();
  for (const t of teams) {
    let n = t.name,
      i = 2;
    while (names.has(n.toLowerCase())) n = `${t.name} (${i++})`;
    names.add(n.toLowerCase());
    t.name = n;
  }
  const active = teams.some((t) => t.id === mine.activeTeamId) ? mine.activeTeamId : teams[0]?.id;
  return { merged: { ...mine, teams, activeTeamId: active }, fromTheirs, conflicts };
}

/** Put the set-aside version of a record back, replacing what is there now. */
export function restoreConflict(plan: Plan, conflictId: string): Plan {
  const c = plan.conflicts?.find((x) => x.id === conflictId);
  if (!c || c.data === undefined) throw new Error("This version can no longer be restored.");
  const next = clone(plan) as unknown as Rec;
  const l = LISTS.find((x) => x.kind === c.kind);
  if (l) {
    const list = ((next[c.kind] as Rec[] | undefined) ?? []).filter((x) => l.key(x) !== c.recordId);
    list.push(clone(c.data) as Rec);
    next[c.kind] = list;
  } else next[c.kind] = clone(c.data);
  (next as unknown as Plan).conflicts = plan.conflicts!.filter((x) => x.id !== conflictId);
  if (!(next as unknown as Plan).conflicts!.length) delete (next as unknown as Plan).conflicts;
  return validatePlan(next);
}

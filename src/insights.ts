// MIT License, Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>. See LICENSE.
/**
 * Plain-language takeaways (v36): the Home headline and the one-line sentence above each chart.
 * Pure functions, no DOM. Worded as indications ("may", "say"), never as judgements of people.
 */
import {
  isActivity,
  personInvolvement,
  involvementSignal,
  staleProjects,
  teamMilestones,
  unstaffedProjects,
  type Plan,
} from "./model.ts";

export type InsightTone = "warn" | "info" | "good";
export type InsightTarget =
  | { kind: "people" }
  | { kind: "projects"; stage?: string }
  | { kind: "person"; id: string }
  | { kind: "project"; id: string }
  | { kind: "milestones" };
export interface Insight {
  id: string;
  tone: InsightTone;
  text: string;
  target: InsightTarget;
}

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
/** "A", "A and B", "A, B and 2 more". */
export function nameList(names: string[], max = 2): string {
  if (names.length <= max) return names.length === 2 ? `${names[0]} and ${names[1]}` : names.join(", ");
  const rest = names.length - max;
  return `${names.slice(0, max).join(", ")} and ${rest} more`;
}

/** What may be worth a look on Home, most pressing first. */
export function homeInsights(plan: Plan, today: string): Insight[] {
  const out: Insight[] = [];
  // v37: the person's own word counts. Red only for those who have not said steady or has room.
  const over = plan.people.filter((p) => involvementSignal(plan, p.id).alarm);
  if (over.length)
    out.push({
      id: "over",
      tone: "warn",
      text: `${nameList(over.map((p) => p.name))} ${over.length === 1 ? "is" : "are"} above the full-plate level.`,
      target: over.length === 1 ? { kind: "person", id: over[0].id } : { kind: "people" },
    });
  const differ = plan.people.filter((p) => involvementSignal(plan, p.id).mismatch);
  if (differ.length)
    out.push({
      id: "differ",
      tone: "info",
      text: `${nameList(differ.map((p) => p.name))} ${differ.length === 1 ? "is" : "are"} above the full-plate level in the numbers but ${differ.length === 1 ? "says" : "say"} the plate is fine: worth checking the percentages together.`,
      target: differ.length === 1 ? { kind: "person", id: differ[0].id } : { kind: "people" },
    });
  const overdue = teamMilestones(plan, today, { days: 0 }).filter((e) => e.state === "overdue");
  if (overdue.length)
    out.push({
      id: "overdue",
      tone: "warn",
      text: `${n(overdue.length, "milestone or deadline has", "milestones or deadlines have")} passed without being ticked off.`,
      target: { kind: "milestones" },
    });
  const stale = staleProjects(plan, today);
  if (stale.length)
    out.push({
      id: "stale",
      tone: "info",
      text: `${nameList(stale.map((p) => p.abbreviation?.trim() || p.name))} ${stale.length === 1 ? "is" : "are"} past ${stale.length === 1 ? "its" : "their"} end date but still marked running.`,
      target: stale.length === 1 ? { kind: "project", id: stale[0].id } : { kind: "projects" },
    });
  const empty = unstaffedProjects(plan);
  if (empty.length)
    out.push({
      id: "unstaffed",
      tone: "info",
      text: `${n(empty.length, "open project has", "open projects have")} no one on ${empty.length === 1 ? "it" : "them"} yet.`,
      target: { kind: "projects", stage: "unstaffed" },
    });
  const soon = teamMilestones(plan, today, { days: 14 }).filter((e) => e.state !== "overdue");
  if (soon.length)
    out.push({
      id: "soon",
      tone: "info",
      text: `${n(soon.length, "milestone or deadline is", "milestones or deadlines are")} due in the next two weeks.`,
      target: { kind: "milestones" },
    });
  const room = plan.people.filter((p) => p.status === "room");
  if (room.length)
    out.push({
      id: "room",
      tone: "good",
      text: `${nameList(room.map((p) => p.name))} ${room.length === 1 ? "says they have" : "say they have"} room for more.`,
      target: room.length === 1 ? { kind: "person", id: room[0].id } : { kind: "people" },
    });
  return out;
}

/** The large sentence on the Home headline tile. */
export function homeHeadline(items: Insight[]): string {
  const look = items.filter((i) => i.tone !== "good").length;
  if (!look) return "Nothing needs attention right now.";
  return `${look === 1 ? "One thing" : `${["", "", "Two", "Three", "Four", "Five"][look] ?? look} things`} may be worth a look.`;
}

type Counts = Record<string, number>;
/** Team card: how full people say their plate is, or the weekly load when hours are tracked. */
export function teamTakeaway(c: { full: number; steady: number; room: number; notSet: number; total: number }): string {
  if (!c.total) return "No one in the team yet.";
  if (c.notSet === c.total) return "No one has said how full their plate is yet.";
  const parts: string[] = [];
  parts.push(c.full ? `${c.full} of ${c.total} say their plate is full` : "No one says their plate is full");
  if (c.room) parts.push(`${c.room} ${c.room === 1 ? "has" : "have"} room`);
  return `${parts.join("; ")}.`;
}
export function loadTakeaway(over: number, notSet: number, total: number): string {
  if (!total) return "No one in the team yet.";
  if (notSet === total) return "No capacity set yet, so the load cannot be shown.";
  return over ? `${n(over, "person is", "people are")} over capacity this week.` : "No one is over capacity this week.";
}
/** Projects card. `byStage` counts research projects per stage id. */
export function projectsTakeaway(byStage: Counts, total: number): string {
  if (!total) return "No research projects yet.";
  const ongoing = byStage.ongoing ?? 0;
  const waiting = byStage.submitted ?? 0;
  const head = ongoing === total ? "All are ongoing" : `${ongoing} of ${total} are ongoing`;
  return waiting ? `${head}; ${waiting} ${waiting === 1 ? "waits" : "wait"} for a funding decision.` : `${head}.`;
}
export function assignmentsTakeaway(c: { ongoing: number; planned: number; active: number }): string {
  if (!c.active) return "No active assignments yet.";
  return c.planned ? `${n(c.planned, "assignment is", "assignments are")} planned but not started.` : "Every active assignment is under way.";
}
export function tasksTakeaway(without: number, active: number): string {
  if (!active) return "No active assignments yet.";
  return without ? `${n(without, "active assignment has", "active assignments have")} no tasks yet.` : "Every active assignment has tasks.";
}
export function estimatesTakeaway(missing: number, active: number): string {
  if (!active) return "No active assignments yet.";
  return missing ? `${n(missing, "assignment still needs", "assignments still need")} an hours estimate.` : "Every active assignment has hours.";
}
/** Involvement chart. */
export function involvementTakeaway(plan: Plan): string {
  const rows = plan.people.map((p) => personInvolvement(plan, p.id)).filter((r) => r.parts.length);
  if (!rows.length) return "No involvement percentages set yet.";
  const avg = Math.round(rows.reduce((t, r) => t + r.total, 0) / rows.length);
  const over = plan.people.filter((p) => involvementSignal(plan, p.id).alarm).length;
  return `On average ${avg}% per person${over ? `; ${n(over, "person is", "people are")} above the full-plate level` : ", no one above the full-plate level"}.`;
}
/** Any grouped chart: names the largest group and its share of the total. */
export function largestTakeaway(rows: { label: string; value: number }[], fmt: (v: number) => string, share = true): string {
  const total = rows.reduce((t, r) => t + r.value, 0);
  if (!total) return "Nothing to show for this choice yet.";
  const top = [...rows].sort((a, b) => b.value - a.value)[0];
  const pc = Math.round((top.value / total) * 100);
  if (rows.length === 1) return `All of it is in ${top.label} (${fmt(top.value)}).`;
  return share ? `${top.label} has the most: ${fmt(top.value)}, ${pc}% of the total.` : `${top.label} has the most: ${fmt(top.value)}.`;
}
/** Research projects only, for the Projects card. */
export const researchOf = (plan: Plan) => plan.projects.filter((p) => !isActivity(p));

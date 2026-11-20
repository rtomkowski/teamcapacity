import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  clone,
  validatePlan,
  milestoneState,
  milestonesOf,
  nextMilestone,
  teamMilestones,
  toggleMilestone,
  setStageNames,
  type Plan,
  type Milestone,
} from "../src/model.ts";
import { plansToMarkwhen } from "../src/markwhen.ts";
import { personCard, cardHtml } from "../src/card.ts";
import { rowHeight, type SlideRow } from "../src/slide.ts";
const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;
const today = "2026-11-19";

const ms = (id: string, date: string, kind: Milestone["kind"] = "milestone", extra: Partial<Milestone> = {}): Milestone => ({
  id,
  kind,
  title: `Point ${id}`,
  date,
  ...extra,
});

function withPoints() {
  const p = clone(seed);
  const a = p.projects[0];
  a.status = "ongoing";
  a.milestones = [
    ms("late", "2026-11-01", "deadline"),
    ms("soon", "2026-11-25"),
    ms("later", "2027-03-01", "deadline", { note: "To the funder" }),
    ms("done", "2026-10-01", "milestone", { done: true }),
  ];
  const b = p.projects[1];
  b.status = "finished";
  b.milestones = [ms("closed", "2026-11-20", "deadline")];
  return p;
}

test("milestones: optional, validated, old files open unchanged", () => {
  assert.doesNotThrow(() => validatePlan(clone(seed)));
  const p = withPoints();
  assert.doesNotThrow(() => validatePlan(clone(p)));
  for (const bad of [
    { ...ms("x", "2026-01-01"), title: " " },
    { ...ms("x", "2026-02-30") },
    { ...ms("x", "2026-01-01"), kind: "goal" },
    { ...ms("x", "2026-01-01"), done: "yes" },
  ]) {
    const q = clone(p);
    q.projects[0].milestones = [bad as Milestone];
    assert.throws(() => validatePlan(q), /milestone or deadline/);
  }
  const dup = clone(p);
  dup.projects[0].milestones = [ms("a", "2026-01-01"), ms("a", "2026-01-02")];
  assert.throws(() => validatePlan(dup), /milestone or deadline/);
});

test("milestones: state, order, next and team list", () => {
  const p = withPoints();
  const a = p.projects[0];
  assert.equal(milestoneState(a.milestones![0], today), "overdue");
  assert.equal(milestoneState(a.milestones![1], today), "soon");
  assert.equal(milestoneState(a.milestones![2], today), "later");
  assert.equal(milestoneState(a.milestones![3], today), "done");
  assert.deepEqual(milestonesOf(a).map((m) => m.id), ["done", "late", "soon", "later"]);
  assert.equal(nextMilestone(a)?.id, "late");
  // Default: open points overdue or due in the window, closed projects left out.
  assert.deepEqual(teamMilestones(p, today, { days: 30 }).map((e) => e.m.id), ["late", "soon"]);
  assert.deepEqual(teamMilestones(p, today, { days: 200 }).map((e) => e.m.id), ["late", "soon", "later"]);
  assert.deepEqual(
    teamMilestones(p, today, { done: true, closed: true }).map((e) => e.m.id),
    ["done", "late", "closed", "soon", "later"],
  );
  assert.deepEqual(teamMilestones(p, today, { days: 30, overdue: false }).map((e) => e.m.id), ["soon"]);
  assert.equal(toggleMilestone(p, a.id, "late"), true);
  assert.equal(a.milestones![0].done, true);
  assert.equal(toggleMilestone(p, a.id, "late"), false);
  assert.equal("done" in a.milestones![0], false);
  assert.equal(toggleMilestone(p, a.id, "missing"), false);
});

test("milestones: markwhen lines in date order, for projects and activities", () => {
  const p = withPoints();
  const a = p.projects[0];
  delete a.kind;
  a.name = "Alpha";
  a.dates = { start: "2026-01-01", end: "2027-12-31" };
  const b = p.projects[2];
  b.kind = "teaching";
  b.name = "Course";
  delete b.schedule;
  b.milestones = [ms("exam", "2027-01-12", "deadline")];
  setStageNames(p);
  const txt = plansToMarkwhen(p, [a, b], { today });
  assert.match(txt, /\n2026-11-01: Point late #Deadline\n/);
  assert.match(txt, /\n2026-10-01: Point done #Milestone #Done\n/);
  assert.match(txt, /\n2027-03-01: Point later #Deadline\nTo the funder\n/);
  assert.match(txt, /\n## Course[^\n]*\n2027-01-12: Point exam #Deadline\n/);
  assert.match(txt, /#Deadline: orange/);
  const alpha = txt.slice(txt.indexOf("## Alpha"), txt.indexOf("# Teaching"));
  const days = [...alpha.matchAll(/^(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]);
  assert.deepEqual(days, [...days].sort());
});

test("milestones: person card and slide rows carry them", () => {
  const p = withPoints();
  const a = p.projects[0];
  const asg = p.assignments.find((x) => x.projectId === a.id)!;
  const card = personCard(p, asg.personId, "PEM", new Date("2026-11-19T12:00:00"));
  const row = card.rows.find((r) => r.project === a.name)!;
  assert.deepEqual(row.points!.map((x) => x.title), ["Point done", "Point late", "Point soon", "Point later"]);
  const html = cardHtml(card);
  assert.match(html, /<ul class="points">/);
  assert.match(html, /1 Nov 2026: Point late/);
  const base: SlideRow = { color: "", title: "P", meta: "", chips: [], groups: [], right: "", status: "", statusColor: "" };
  assert.ok(rowHeight({ ...base, points: [{ kind: "deadline", text: "x", color: "", done: false }] }) > rowHeight(base));
});

test("date groups: every stage shows at least one group, contract where extensions belong", async () => {
  const { DATE_GROUPS_FOR, projectStatuses } = await import("../src/model.ts");
  for (const s of projectStatuses) assert.ok(DATE_GROUPS_FOR[s]?.length, s);
  for (const s of ["granted", "ongoing", "finished"] as const) assert.ok(DATE_GROUPS_FOR[s].includes("contract"));
  assert.deepEqual(DATE_GROUPS_FOR.unspecified.length, 5);
});

test("endShift: open points near or after the old end move by the same days, twice", async () => {
  const { endShift } = await import("../src/model.ts");
  const saved = [
    ms("final", "2028-10-31", "deadline"),
    ms("near", "2028-08-15", "deadline"),
    ms("early", "2027-03-31"),
    ms("done", "2028-09-30", "milestone", { done: true }),
    ms("edited", "2028-12-01", "deadline"),
  ];
  const draft = saved.map((m) => (m.id === "edited" ? { ...m, date: "2029-01-10" } : m));
  const one = endShift("2028-08-31", "2029-08-31", draft, saved);
  assert.equal(one.delta, 365);
  assert.deepEqual(one.moves.map((m) => [m.id, m.to]), [["final", "2029-10-31"], ["near", "2029-08-15"]]);
  // Second extension: from the first extension's end.
  const after = saved.map((m) => ({ ...m, date: one.moves.find((x) => x.id === m.id)?.to ?? m.date }));
  const two = endShift("2029-08-31", "2030-02-28", after, after);
  assert.deepEqual(two.moves.map((m) => [m.id, m.to]), [["final", "2030-04-30"], ["near", "2030-02-12"]]);
  assert.deepEqual(endShift(undefined, "2029-01-01", draft, saved).moves, []);
  assert.deepEqual(endShift("2029-01-01", "2029-01-01", draft, saved).moves, []);
});

test("carryMove: records the earlier and first date, keeps them, clears on moving back", async () => {
  const { carryMove, movedText } = await import("../src/model.ts");
  const day = (d: string) => d;
  const saved = ms("end", "2026-11-30", "deadline");
  const one = carryMove(saved, { ...saved, date: "2027-11-30" }, "2026-11-19");
  assert.deepEqual([one.movedFrom, one.originalDate, one.movedOn], ["2026-11-30", "2026-11-30", "2026-11-19"]);
  assert.equal(movedText(one, day), "Moved from 2026-11-30");
  const kept = carryMove(one, { ...one, title: "Renamed" }, "2026-12-01");
  assert.equal(kept.movedFrom, "2026-11-30");
  const two = carryMove(one, { ...one, date: "2028-05-31" }, "2027-06-01");
  assert.deepEqual([two.movedFrom, two.originalDate], ["2027-11-30", "2026-11-30"]);
  assert.equal(movedText(two, day), "Moved from 2027-11-30, originally 2026-11-30");
  const back = carryMove(two, { ...two, date: "2026-11-30" }, "2027-06-02");
  assert.equal(back.movedFrom, undefined);
  assert.equal(carryMove(undefined, { ...saved }, "2026-11-19").movedFrom, undefined);
  const p = clone(seed);
  p.projects[0].milestones = [two];
  assert.doesNotThrow(() => validatePlan(p));
});

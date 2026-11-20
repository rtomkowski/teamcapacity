import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, scheduleDays, personLoad, staleProjects, unstaffedProjects, uid, clone, type Plan } from "../src/model.ts";

const demo = validatePlan(JSON.parse(fs.readFileSync(new URL("../src/demo-ee.json", import.meta.url), "utf8")));

test("every-second-week meetings stay on the right weeks across a summer-time change", () => {
  // Mondays every 2 weeks from 2 March 2026; Europe switches to summer time on 29 March.
  const days = scheduleDays({ mode: "recurring", freq: "weekly", interval: 2, weekdays: [0], start: "2026-03-02" }, [], "2026-03-01", "2026-05-01").map((d) => d.date);
  assert.deepEqual(days, ["2026-03-02", "2026-03-16", "2026-03-30", "2026-04-13", "2026-04-27"]);
});

test("hours on finished or rejected projects no longer count in the weekly load", () => {
  const p = clone(demo) as Plan;
  const a = p.assignments.find((x) => x.status === "ongoing")!;
  p.allocations = [{ id: "x", assignmentId: a.id, week: "2026-11-16", hours: 10 }];
  assert.equal(personLoad(p, a.personId, "2026-11-16").total, 10);
  p.projects.find((x) => x.id === a.projectId)!.status = "finished";
  assert.equal(personLoad(p, a.personId, "2026-11-16").total, 0);
});

test("review hints: projects past their end, unstaffed open projects only", () => {
  const stale = staleProjects(demo, "2026-11-20").map((p) => p.abbreviation);
  assert.deepEqual(stale, []);
  assert.deepEqual(staleProjects(demo, "2027-01-15").map((p) => p.abbreviation), ["AMFIN"]);
  const p = clone(demo) as Plan;
  p.projects.push({ id: "closed", name: "Old", status: "finished", notes: "" }, { id: "open", name: "New", status: "proposal", notes: "" });
  assert.deepEqual(unstaffedProjects(p).map((x) => x.id), ["open"]);
});

test("ids look like UUIDs", () => {
  assert.match(uid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

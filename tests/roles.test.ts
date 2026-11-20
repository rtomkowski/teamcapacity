import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, validatePlan, rolesOf, rolesText, scheduleDays, scheduleWeekHours, scheduleSummary, type Plan } from "../src/model.ts";
import { plansToMarkwhen } from "../src/markwhen.ts";
import { personCard } from "../src/card.ts";

const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("roles: per activity kind, team members and outside names, validated", () => {
  const p = clone(seed);
  const [a, b, c] = p.projects;
  const [x, y] = p.people;
  a.piId = x.id;
  b.kind = "supervision";
  b.roles = [
    { role: "Supervisor", personId: y.id, name: y.name },
    { role: "Assistant supervisor", name: "Ana Ruiz" },
  ];
  c.kind = "other";
  c.roles = [{ role: "Organiser", personId: "gone", name: "Old Name" }];
  assert.doesNotThrow(() => validatePlan(clone(p)));
  assert.deepEqual(rolesOf(p, a).map((r) => `${r.short} ${r.name}`), [`PI ${x.name}`]);
  assert.equal(rolesText(p, b), `Supervisor ${y.name} · Assistant supervisor Ana Ruiz`);
  // A removed team member keeps the stored name and is no longer linked.
  assert.deepEqual(rolesOf(p, c), [{ role: "Organiser", name: "Old Name", short: "Organiser", personId: undefined }]);
  // PI only counts on research projects; roles only on activities.
  b.piId = x.id;
  a.roles = [{ role: "Host", name: "Z" }];
  assert.equal(rolesOf(p, b).some((r) => r.role === "PI"), false);
  assert.equal(rolesOf(p, a).length, 1);
  for (const bad of [{ role: " ", name: "A" }, { role: "Host" }, { role: "Host", name: 5 }]) {
    const q = clone(p);
    q.projects[1].roles = [bad as never];
    assert.throws(() => validatePlan(q), /activity roles/);
  }
  const asg = p.assignments.find((z) => z.projectId === b.id);
  if (asg) {
    const card = personCard(p, asg.personId, "PEM", new Date("2026-11-19T12:00:00"));
    assert.match(card.rows.find((r) => r.project === b.name)!.roles!, /Assistant supervisor Ana Ruiz/);
  }
});

test("teaching: variable days and hours per week", () => {
  const p = clone(seed);
  p.settings.periods = [{ id: "p1", name: "Period 1", start: "2026-11-02", end: "2026-11-29" }];
  const t = p.projects[0];
  t.kind = "teaching";
  t.schedule = { mode: "periods", periodIds: ["p1"], variableDays: true, weekHours: 6, from: "09:00", to: "12:00" };
  assert.doesNotThrow(() => validatePlan(clone(p)));
  const ps = p.settings.periods;
  assert.equal(scheduleWeekHours(t.schedule, ps, "2026-11-09"), 6);
  assert.equal(scheduleDays(t.schedule, ps, "2026-11-09", "2026-11-15").length, 5);
  assert.equal(scheduleSummary(t.schedule, ps), "Period 1 · Variable days 09:00 to 12:00 · 6 h per week");
  // Fixed days spread the weekly hours over those days.
  const fixed = { mode: "periods" as const, periodIds: ["p1"], weekdays: [0, 2], weekHours: 4 };
  assert.deepEqual(scheduleDays(fixed, ps, "2026-11-09", "2026-11-15").map((d) => d.hours), [2, 2]);
  // Without hours per week the old behaviour (timed weekdays) stays.
  assert.equal(scheduleWeekHours({ mode: "periods", periodIds: ["p1"], weekdays: [1], from: "10:00", to: "12:00" }, ps, "2026-11-09"), 2);
  const mw = plansToMarkwhen(p, [t], { today: "2026-11-19" });
  assert.match(mw, /6 h per week/);
  assert.match(mw, /Variable days, 09:00 to 12:00/);
  for (const bad of [{ weekHours: 0 }, { weekHours: 100 }, { variableDays: "yes" }]) {
    const q = clone(p);
    Object.assign(q.projects[0].schedule!, bad);
    assert.throws(() => validatePlan(q), /activity schedule/);
  }
});

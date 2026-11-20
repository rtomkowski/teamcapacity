import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, validatePlan, involvement, taskPercent, personInvolvement, overloadLevel, fullLevel, usesPercent, assignmentDiff, type Plan } from "../src/model.ts";
import { personCard } from "../src/card.ts";

const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("involvement: set %, else task %; totals can pass 100; levels", () => {
  const p = clone(seed);
  const person = p.people[0];
  const mine = p.assignments.filter((a) => a.personId === person.id);
  assert.ok(mine.length >= 1);
  assert.equal(usesPercent(p), false);
  mine.forEach((a) => {
    a.status = "ongoing";
    p.projects.find((x) => x.id === a.projectId)!.status = "ongoing";
  });
  mine[0].percent = 70;
  if (mine[1]) {
    mine[1].tasks = [{ taskId: "t1", percent: 30 }, { taskId: "t2", percent: 25 }, { taskId: "t3" }];
    assert.equal(taskPercent(mine[1]), 55);
    assert.equal(involvement(mine[1]), 55);
  }
  const inv = personInvolvement(p, person.id);
  const expect = 70 + (mine[1] ? 55 : 0);
  assert.equal(inv.total, expect);
  assert.equal(overloadLevel(p), 100);
  assert.equal(inv.over, expect > 100);
  p.settings.overloadPercent = 150;
  assert.equal(personInvolvement(p, person.id).over, false);
  person.fullAt = 60;
  assert.equal(fullLevel(p, person), 60);
  assert.equal(personInvolvement(p, person.id).over, true);
  // Finished assignments and closed projects do not count; planned only when asked.
  mine[0].status = "planned";
  assert.equal(personInvolvement(p, person.id).total, expect - 70);
  assert.equal(personInvolvement(p, person.id, { planned: true }).total, expect);
  assert.equal(usesPercent(p), true);
});

test("involvement: validated, in the diff and on the person card", () => {
  const p = clone(seed);
  const a = p.assignments[0];
  a.status = "ongoing";
  p.projects.find((x) => x.id === a.projectId)!.status = "ongoing";
  a.percent = 40;
  assert.doesNotThrow(() => validatePlan(clone(p)));
  for (const bad of [-1, 201, Number.NaN]) {
    const q = clone(p);
    q.assignments[0].percent = bad;
    assert.throws(() => validatePlan(q));
  }
  const q = clone(p);
  q.settings.overloadPercent = 5;
  assert.throws(() => validatePlan(q), /settings/);
  const lines = assignmentDiff(p, a, { status: a.status, notes: a.notes, tasks: a.tasks ?? [], percent: 60 });
  assert.ok(lines.some((l) => l.text === "Involvement: 40% to 60%"));
  const card = personCard(p, a.personId, "PEM", new Date("2026-11-20T12:00:00"));
  assert.match(card.involvement!, /^40% of full time across 1 project/);
  assert.equal(card.rows.find((r) => r.percent === 40)?.myStatus, "Ongoing");
});

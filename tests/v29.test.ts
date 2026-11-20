import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, analyticsData, type Plan } from "../src/model.ts";

const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("analytics builder: measures and groups over current work", () => {
  const p = clone(seed);
  p.projects.forEach((x) => (x.status = "ongoing"));
  p.assignments.forEach((a, i) => {
    a.status = i === 0 ? "planned" : "ongoing";
    a.percent = 10 * (i + 1);
  });
  const ongoing = p.assignments.filter((a) => a.status === "ongoing");
  const byPerson = analyticsData(p, { measure: "assignments", group: "person" });
  assert.equal(byPerson.reduce((t, x) => t + x.value, 0), ongoing.length);
  const withPlanned = analyticsData(p, { measure: "assignments", group: "person", planned: true });
  assert.equal(withPlanned.reduce((t, x) => t + x.value, 0), p.assignments.length);
  const inv = analyticsData(p, { measure: "involvement", group: "project" });
  assert.equal(inv.reduce((t, x) => t + x.value, 0), ongoing.reduce((t, a) => t + a.percent!, 0));
  // Highest first.
  assert.deepEqual(inv.map((x) => x.value), [...inv.map((x) => x.value)].sort((a, b) => b - a));
  // Distinct people per project never exceeds the number of people.
  const people = analyticsData(p, { measure: "people", group: "project", planned: true });
  assert.ok(people.every((x) => x.value <= p.people.length));
  // Finished projects drop out.
  p.projects.forEach((x) => (x.status = "finished"));
  assert.deepEqual(analyticsData(p, { measure: "assignments", group: "person" }), []);
});

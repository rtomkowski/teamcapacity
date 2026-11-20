import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, analyticsData, isActivity, centreOptions, personInvolvement } from "../src/model.ts";
import { addTeamFromPlan } from "../src/teams.ts";

const demo = validatePlan(JSON.parse(fs.readFileSync(new URL("../src/demo-ee.json", import.meta.url), "utf8")));

test("Experimental Engineering demo has the requested team", () => {
  const roles: Record<string, number> = {};
  for (const p of demo.people) roles[p.role!] = (roles[p.role!] ?? 0) + 1;
  assert.deepEqual(roles, {
    Professor: 1, "Associate professor": 1, "Assistant professor": 1, Researcher: 2,
    "Postdoctoral researcher": 2, "Research engineer": 3, "PhD candidate": 3,
    "Industrial PhD candidate": 4, Amanuensis: 3, "Visiting researcher": 1, "Visiting student": 3,
  });
  const research = demo.projects.filter((p) => !isActivity(p));
  assert.equal(research.length, 13);
  const inCentre = research.filter((p) => p.centre).length;
  assert.ok(inCentre >= 6 && inCentre <= 7);
  assert.equal(centreOptions(demo).length, 2);
  const teaching = demo.projects.filter((p) => p.kind === "teaching");
  assert.equal(teaching.filter((p) => !p.name.startsWith("Guest lecture")).length, 4);
  assert.equal(teaching.filter((p) => p.name.startsWith("Guest lecture")).length, 4);
});

test("analytics can group by research centre", () => {
  const rows = analyticsData(demo, { measure: "projects", group: "centre", scope: "research" });
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.label === "Not in a centre"));
});

test("demo team gets the given name and some people exceed 100%", () => {
  const ws = addTeamFromPlan({ format: "pem-team-workspace", version: 1, activeTeamId: "x", teams: [] } as any, demo, "", "Experimental Engineering (demo)");
  assert.equal(ws.teams[0].name, "Experimental Engineering (demo)");
  assert.ok(demo.people.some((p) => personInvolvement(demo, p.id).over));
});

test("centre must be text", () => {
  const bad = structuredClone(demo) as any;
  bad.projects[0].centre = 5;
  assert.throws(() => validatePlan(bad));
});

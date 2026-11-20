import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, validatePlan, coordinatorId, coordinatorFirst, projectLabel, type Plan } from "../src/model.ts";
import { createWorkspace, addTeamFromPlan } from "../src/teams.ts";

const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("coordinator: chosen person, else team lead, always first", () => {
  const p = clone(seed);
  const [a, b, c] = p.people;
  assert.equal(coordinatorId(p), p.profile?.leadId && p.people.some((x) => x.id === p.profile!.leadId) ? p.profile!.leadId : undefined);
  p.profile = { ...(p.profile ?? {}), leadId: b.id };
  assert.equal(coordinatorId(p), b.id);
  p.profile.coordinatorId = c.id;
  assert.equal(coordinatorId(p), c.id);
  assert.deepEqual(coordinatorFirst(p, [a, b, c], (x) => x.id).map((x) => x.id), [c.id, a.id, b.id]);
  p.profile.coordinatorId = "gone";
  assert.equal(coordinatorId(p), b.id);
  assert.doesNotThrow(() => validatePlan(clone(p)));
  (p.profile as Record<string, unknown>).coordinatorId = 5;
  assert.throws(() => validatePlan(clone(p)), /team profile/);
});

test("project abbreviation and full title", () => {
  const p = clone(seed);
  const x = p.projects[0];
  assert.equal(projectLabel(x), x.name);
  x.abbreviation = "NOVA";
  x.fullTitle = "A long official title";
  assert.equal(projectLabel(x), "NOVA");
  assert.doesNotThrow(() => validatePlan(clone(p)));
  x.abbreviation = "x".repeat(31);
  assert.throws(() => validatePlan(clone(p)), /project details/);
});

test("load a team from a JSON file as a new, uniquely named team", () => {
  const ws = createWorkspace(clone(seed));
  const plan = clone(seed);
  plan.profile = { abbreviation: "EXP" };
  const one = addTeamFromPlan(ws, plan, "exp.json");
  assert.equal(one.teams.length, ws.teams.length + 1);
  assert.equal(one.teams.at(-1)!.name, "EXP");
  assert.equal(one.activeTeamId, one.teams.at(-1)!.id);
  const two = addTeamFromPlan(one, plan, "exp.json");
  assert.equal(two.teams.at(-1)!.name, "EXP (2)");
  delete plan.profile;
  assert.equal(addTeamFromPlan(ws, plan, "my-team_file.json").teams.at(-1)!.name, "my team file");
});

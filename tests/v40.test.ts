import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, type Plan } from "../src/model.ts";
import { createWorkspace, addTeamFromPlan, removeTeam, restoreTeam } from "../src/teams.ts";

const demo = validatePlan(JSON.parse(fs.readFileSync(new URL("../src/demo-ee.json", import.meta.url), "utf8"))) as Plan;

test("removing a team keeps the others and opens the first remaining one", () => {
  const ws = addTeamFromPlan(createWorkspace(demo), demo, "x.json", "Second");
  const second = ws.teams[1].id;
  assert.equal(ws.activeTeamId, second);
  const r = removeTeam(ws, second);
  assert.equal(r.workspace.teams.length, 1);
  assert.equal(r.workspace.activeTeamId, "first-team");
  assert.equal(r.wasActive, true);
  const back = restoreTeam(r.workspace, r.removed, r.index, r.wasActive);
  assert.deepEqual(back.teams.map((t) => t.id), ws.teams.map((t) => t.id));
  assert.equal(back.activeTeamId, second);
});

test("the last team cannot be removed", () => {
  assert.throws(() => removeTeam(createWorkspace(demo), "first-team"), /last team/);
});

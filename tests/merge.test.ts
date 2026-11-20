import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, type Plan } from "../src/model.ts";
import { mergePlans, mergeWorkspaces, restoreConflict } from "../src/merge.ts";
import { createWorkspace } from "../src/teams.ts";

const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("merge: changes on different records from both people are all kept", () => {
  const base = clone(seed);
  const mine = clone(base);
  const theirs = clone(base);
  mine.people[0].notes = "Changed by me";
  theirs.people[1].notes = "Changed by a colleague";
  theirs.projects[0].description = "New description from the file";
  mine.people.push({ id: "p-new-mine", name: "New here", capacityHours: null, reservedHours: 0, notes: "" });
  theirs.people.push({ id: "p-new-theirs", name: "New there", capacityHours: null, reservedHours: 0, notes: "" });
  const r = mergePlans(base, mine, theirs);
  assert.equal(r.conflicts.length, 0);
  const m = r.merged;
  assert.equal(m.people[0].notes, "Changed by me");
  assert.equal(m.people[1].notes, "Changed by a colleague");
  assert.equal(m.projects[0].description, "New description from the file");
  assert.ok(m.people.some((x) => x.id === "p-new-mine") && m.people.some((x) => x.id === "p-new-theirs"));
  assert.equal(r.fromTheirs, 3);
});

test("merge: same record changed on both sides keeps mine and sets theirs aside, restorable", () => {
  const base = clone(seed);
  const mine = clone(base);
  const theirs = clone(base);
  mine.projects[0].notes = "Mine";
  theirs.projects[0].notes = "Theirs";
  const r = mergePlans(base, mine, theirs);
  assert.equal(r.merged.projects[0].notes, "Mine");
  assert.equal(r.conflicts.length, 1);
  const c = r.merged.conflicts![0];
  assert.equal(c.kind, "projects");
  assert.equal((c.data as { notes: string }).notes, "Theirs");
  const back = restoreConflict(r.merged, c.id);
  assert.equal(back.projects.find((x) => x.id === base.projects[0].id)!.notes, "Theirs");
  assert.equal(back.conflicts, undefined);
});

test("merge: deletions follow the side that deleted, unless the other side changed it", () => {
  const base = clone(seed);
  const mine = clone(base);
  const theirs = clone(base);
  const gone = base.projects[base.projects.length - 1];
  // Removed in the file, unchanged here: removed. Its assignments go too.
  theirs.projects = theirs.projects.filter((x) => x.id !== gone.id);
  theirs.assignments = theirs.assignments.filter((a) => a.projectId !== gone.id);
  const ids = new Set(theirs.assignments.map((a) => a.id));
  theirs.allocations = theirs.allocations.filter((x) => ids.has(x.assignmentId));
  let r = mergePlans(base, mine, theirs);
  assert.equal(r.merged.projects.some((x) => x.id === gone.id), false);
  // Removed in the file, but changed here: kept, with a note.
  mine.projects.find((x) => x.id === gone.id)!.notes = "Still working on this";
  r = mergePlans(base, mine, theirs);
  assert.equal(r.merged.projects.some((x) => x.id === gone.id), true);
  assert.ok(r.conflicts.some((c) => c.recordId === gone.id));
});

test("merge: without a base nothing is dropped; workspaces merge per team", () => {
  const a = clone(seed);
  const b = clone(seed);
  b.people.push({ id: "p-only-b", name: "Only in file", capacityHours: null, reservedHours: 0, notes: "" });
  const r = mergePlans(undefined, a, b);
  assert.ok(r.merged.people.some((x) => x.id === "p-only-b"));
  const wsMine = createWorkspace(clone(seed));
  const wsBase = clone(wsMine);
  const wsTheirs = clone(wsMine);
  wsTheirs.teams.push({ id: "team-2", name: "Second team", plan: clone(seed) });
  wsTheirs.teams[0].plan.people[0].notes = "From the file";
  wsMine.teams[0].plan.projects[0].notes = "From here";
  const w = mergeWorkspaces(wsBase, wsMine, wsTheirs);
  assert.equal(w.merged.teams.length, 2);
  assert.equal(w.merged.teams[0].plan.people[0].notes, "From the file");
  assert.equal(w.merged.teams[0].plan.projects[0].notes, "From here");
  assert.equal(w.merged.activeTeamId, wsMine.activeTeamId);
});

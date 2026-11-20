import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { clone, setStageNames, type Plan } from "../src/model.ts";
import { plansToMarkwhen, mwTag, mwText } from "../src/markwhen.ts";
const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;

test("markwhen tags and text are safe", () => {
  assert.equal(mwTag("Vetenskapsrådet"), "Vetenskapsradet");
  assert.equal(mwTag("Under negotiation"), "Under_negotiation");
  assert.equal(mwTag("2026"), "n2026");
  assert.equal(mwText("Lab #2\nnotes"), "Lab No.2 notes");
});

test("markwhen export: projects as groups with periods, milestones and tags", () => {
  const p = clone(seed);
  const pr = p.projects[0];
  delete pr.kind;
  pr.name = "Test project";
  pr.status = "ongoing";
  pr.type = "Research";
  pr.funder = "Vinnova";
  pr.dates = { appStart: "2024-01-10", appDue: "2024-03-01", decisionOn: "2024-06-01", start: "2024-09-01", end: "2026-08-31" };
  pr.extensions = [{ id: "e1", end: "2026-12-31", note: "No-cost", approvedOn: "2026-05-01" }];
  setStageNames(p);
  const txt = plansToMarkwhen(p, [pr], { title: "Team projects", today: "2026-11-19" });
  assert.match(txt, /^---\ntitle: Team projects\n/);
  assert.match(txt, /\n# Research projects\n\n## Test project #Ongoing #Research #Vinnova\n/);
  assert.match(txt, /\n2024-01-10\/2024-03-01: Application #Application\n/);
  assert.match(txt, /\n2024-03-01: Submitted #Milestone\n/);
  assert.match(txt, /\n2024-06-01: Decision: granted #Milestone\n/);
  assert.match(txt, /\n2024-09-01\/2026-08-31: Contract period #Contract\n/);
  assert.match(txt, /\n2026-08-31\/2026-12-31: Extension 1 #Extension\nNo-cost\n/);
  const days = [...txt.matchAll(/^(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]);
  assert.deepEqual(days, [...days].sort());
});

test("markwhen export: recurring meetings and undated projects", () => {
  const p = clone(seed);
  const a = p.projects[0];
  a.kind = "other";
  a.name = "Team pulse";
  a.schedule = { mode: "recurring", start: "2026-09-01", end: "2027-05-20", from: "09:30", to: "09:50", freq: "weekly", weekdays: [0] };
  const b = p.projects[1];
  delete b.kind;
  b.name = "No dates";
  delete b.dates;
  delete b.startYear;
  delete b.endYear;
  delete b.extensions;
  setStageNames(p);
  const txt = plansToMarkwhen(p, [a, b], { today: "2026-11-19" });
  assert.match(txt, /\n2026-09-07 09:30\/2026-09-07 09:50 every week on Monday until 2027-05-20: Team pulse\n/);
  assert.match(txt, /\/\/ Not on the timeline \(no dates yet\): No dates\n$/);
});

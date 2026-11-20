import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, clone, type Plan } from "../src/model.ts";
import { homeInsights, homeHeadline, nameList, teamTakeaway, projectsTakeaway, largestTakeaway, tasksTakeaway } from "../src/insights.ts";

const demo = validatePlan(JSON.parse(fs.readFileSync(new URL("../src/demo-ee.json", import.meta.url), "utf8")));

test("name lists read naturally", () => {
  assert.equal(nameList(["Ana"]), "Ana");
  assert.equal(nameList(["Ana", "Bo"]), "Ana and Bo");
  assert.equal(nameList(["Ana", "Bo", "Cy", "Di"]), "Ana, Bo and 2 more");
});

test("the Home headline counts only what may need a look", () => {
  const items = homeInsights(demo as Plan, "2026-11-20");
  assert.ok(items.length > 0);
  const look = items.filter((i) => i.tone !== "good").length;
  assert.match(homeHeadline(items), look ? /may be worth a look/ : /Nothing needs attention/);
  assert.equal(homeHeadline(items.filter((i) => i.tone === "good")), "Nothing needs attention right now.");
});

test("someone above the full-plate level is named first", () => {
  const p = clone(demo) as Plan;
  const a = p.assignments.find((x) => x.status === "ongoing")!;
  a.percent = 250;
  const first = homeInsights(p, "2026-11-20")[0];
  assert.equal(first.id, "over");
  assert.ok(first.text.includes(p.people.find((x) => x.id === a.personId)!.name));
});

test("chart takeaways", () => {
  assert.equal(teamTakeaway({ full: 0, steady: 0, room: 0, notSet: 3, total: 3 }), "No one has said how full their plate is yet.");
  assert.equal(teamTakeaway({ full: 2, steady: 3, room: 1, notSet: 0, total: 6 }), "2 of 6 say their plate is full; 1 has room.");
  assert.equal(projectsTakeaway({ ongoing: 4, submitted: 1 }, 6), "4 of 6 are ongoing; 1 waits for a funding decision.");
  assert.equal(tasksTakeaway(0, 5), "Every active assignment has tasks.");
  assert.equal(largestTakeaway([{ label: "CFS", value: 3 }, { label: "DMC", value: 1 }], String), "CFS has the most: 3, 75% of the total.");
  assert.equal(largestTakeaway([], String), "Nothing to show for this choice yet.");
});

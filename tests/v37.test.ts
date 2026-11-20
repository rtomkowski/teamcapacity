import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, clone, involvementSignal, type Plan } from "../src/model.ts";
import { homeInsights } from "../src/insights.ts";

const demo = validatePlan(JSON.parse(fs.readFileSync(new URL("../src/demo-ee.json", import.meta.url), "utf8")));
const mei = (p: Plan) => p.people.find((x) => x.name === "Mei Chen")!;

test("above the level is red only while the person has not said steady or has room", () => {
  const p = clone(demo) as Plan;
  const m = mei(p);
  delete m.status;
  assert.equal(involvementSignal(p, m.id).tone, "red");
  m.status = "full";
  assert.equal(involvementSignal(p, m.id).tone, "red");
  m.status = "room";
  const s = involvementSignal(p, m.id);
  assert.equal(s.tone, "amber");
  assert.equal(s.mismatch, true);
  assert.equal(s.alarm, false);
  m.status = "steady";
  assert.equal(involvementSignal(p, m.id).alarm, false);
});

test("saying full plate makes it at least amber", () => {
  const p = clone(demo) as Plan;
  const low = p.people.find((x) => { const s = involvementSignal(p, x.id); return s.tone === "green"; })!;
  low.status = "full";
  assert.equal(involvementSignal(p, low.id).tone, "amber");
});

test("Home names a mismatch as a question, not a warning", () => {
  const p = clone(demo) as Plan;
  mei(p).status = "room";
  const items = homeInsights(p, "2026-11-20");
  assert.ok(!items.find((i) => i.id === "over")?.text.includes("Mei Chen"));
  const d = items.find((i) => i.id === "differ")!;
  assert.equal(d.tone, "info");
  assert.ok(d.text.includes("Mei Chen"));
});

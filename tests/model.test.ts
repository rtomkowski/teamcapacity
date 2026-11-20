import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  assignmentCounts,
  personLoad,
  capacityFor,
  setAllocation,
  validatePlan,
  monday,
  addWeeks,
  clone,
  addWholeTeam,
  applyConnections,
  connectRefs,
  dependencyGraph,
  removeWait,
  leaveWorkItem,
  parseItemLines,
  toggleTaskItem,
  itemCounts,
  assignmentDiff,
  stageDefs,
  stageKey,
  stageLabel,
  setStageNames,
  typeOptions,
  typeFilterOptions,
  funderOptions,
  cleanList,
  renameOnProjects,
  DEFAULT_TYPES,
  type Plan,
} from "../src/model.ts";
import { importExcel, excelBuffer } from "../src/excel.ts";
const seed = JSON.parse(
  await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
) as Plan;
const week = "2026-11-16";
test("full workbook baseline includes projects beyond the former dashboard limit", () => {
  assert.equal(seed.people.length, 13);
  assert.equal(seed.projects.length, 27);
  assert.equal(seed.assignments.length, 61);
  assert.deepEqual(assignmentCounts(seed), {
    ongoing: 22,
    planned: 33,
    finished: 6,
    active: 55,
    total: 61,
  });
  assert.equal(assignmentCounts(seed, "person-2").active, 11);
  assert.equal(
    seed.assignments.filter((a) => a.status !== "finished" && !a.estimated)
      .length,
    55,
  );
});
test("unknown capacity and missing estimates stay unknown", () => {
  const load = personLoad(seed, "person-2", week);
  assert.equal(load.capacity, null);
  assert.equal(load.utilisation, null);
  assert.equal(load.missing, 11);
});
test("ongoing plus planned hours expose overbooking and reserved hours reduce capacity", () => {
  let p = clone(seed);
  p.people[1].capacityHours = 40;
  p.people[1].reservedHours = 8;
  const ongoing = p.assignments.find(
    (a) => a.personId === "person-2" && a.status === "ongoing",
  )!;
  const planned = p.assignments.find(
    (a) => a.personId === "person-2" && a.status === "planned",
  )!;
  p = setAllocation(p, ongoing.id, week, addWeeks(week, 1), 24);
  p = setAllocation(p, planned.id, week, week, 12);
  const load = personLoad(p, "person-2", week);
  assert.equal(load.capacity, 32);
  assert.equal(load.committed, 24);
  assert.equal(load.tentative, 12);
  assert.equal(load.utilisation, 1.125);
  assert.equal(load.remaining, -4);
  assert.equal(load.over, true);
  assert.equal(load.missing, 9);
  assert.equal(personLoad(p, "person-2", addWeeks(week, 1)).total, 24);
  p = setAllocation(p, ongoing.id, week, week, 20);
  assert.equal(personLoad(p, "person-2", week).total, 32);
  assert.equal(personLoad(p, "person-2", addWeeks(week, 1)).total, 24);
});
test("zero capacity is preserved and positive demand flags overbooking", () => {
  let p = clone(seed);
  p.people[1].capacityHours = 40;
  p.capacityOverrides.push({ personId: "person-2", week, hours: 0 });
  const ongoing = p.assignments.find(
    (a) => a.personId === "person-2" && a.status === "ongoing",
  )!;
  p = setAllocation(p, ongoing.id, week, week, 1);
  assert.equal(capacityFor(p, "person-2", week), 0);
  assert.equal(personLoad(p, "person-2", week).over, true);
  assert.equal(personLoad(p, "person-2", week).utilisation, null);
});
test("explicit zero allocation counts as an estimate and finished work is excluded", () => {
  let p = clone(seed);
  const a = p.assignments.find((a) => a.status === "ongoing")!;
  p = setAllocation(p, a.id, week, week, 0);
  assert.equal(p.assignments.find((x) => x.id === a.id)?.estimated, true);
  p = setAllocation(p, a.id, week, week, 10);
  p.assignments.find((x) => x.id === a.id)!.status = "finished";
  assert.equal(personLoad(p, a.personId, week).total, 0);
  assert.equal(p.allocations.length, 1);
});
test("allocation boundaries reject invalid inputs without changing source data", () => {
  const a = seed.assignments.find((a) => a.status === "ongoing")!;
  for (const hours of [-1, NaN, Infinity, 169])
    assert.throws(() => setAllocation(seed, a.id, week, week, hours));
  assert.throws(() => setAllocation(seed, a.id, "2026-11-17", week, 1));
  assert.throws(() => setAllocation(seed, a.id, addWeeks(week, 1), week, 1));
  assert.throws(() => setAllocation(seed, a.id, week, "2033-11-14", 1));
  assert.equal(seed.allocations.length, 0);
});
test("backup validation rejects broken links, duplicate records and invalid capacity", () => {
  assert.deepEqual(validatePlan(seed), seed);
  let p = clone(seed);
  p.assignments[0].personId = "missing";
  assert.throws(() => validatePlan(p));
  p = clone(seed);
  p.assignments.push({ ...p.assignments[0], id: "duplicate-pair" });
  assert.throws(() => validatePlan(p));
  p = clone(seed);
  p.people[0].capacityHours = 8;
  p.people[0].reservedHours = 9;
  assert.throws(() => validatePlan(p));
  p = clone(seed);
  p.capacityOverrides.push({
    personId: "person-1",
    week: "2026-11-17",
    hours: 5,
  });
  assert.throws(() => validatePlan(p));
});
test("Monday week arithmetic crosses year and daylight saving boundaries", () => {
  assert.equal(monday("2026-11-22"), week);
  assert.equal(addWeeks("2026-12-28", 1), "2027-01-04");
  assert.equal(addWeeks("2026-10-19", 1), "2026-10-26");
});
/** A workbook in the original engagement-sheet layout (no embedded app data), built from the
 * anonymised sample plan: row 3 holds "Team member" and the project names, one row per person
 * below with x (ongoing), p (planned) or d (finished). */
async function rawWorkbook(plan: Plan): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Engagement");
  ws.getCell(3, 1).value = "Team member";
  ws.getCell(3, 5).value = "# Projects in Planning";
  plan.projects.forEach((p, j) => (ws.getCell(3, 6 + j).value = p.name));
  plan.people.forEach((person, i) => {
    ws.getCell(4 + i, 1).value = person.name;
    for (const a of plan.assignments.filter((a) => a.personId === person.id)) {
      const j = plan.projects.findIndex((p) => p.id === a.projectId);
      ws.getCell(4 + i, 6 + j).value = { ongoing: "x", planned: "p", finished: "d" }[a.status as string] ?? "";
    }
  });
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
test("Excel import reads all raw columns and preserves mixed assignment states", async () => {
  const bytes = await rawWorkbook(seed);
  const result = await importExcel(new File([bytes], "source.xlsx"));
  assert.equal(result.plan.projects.length, 27);
  assert.deepEqual(assignmentCounts(result.plan), assignmentCounts(seed));
  const mixed = result.plan.projects.find((p) => p.name === "Project 12")!;
  assert.equal(mixed.status, "ongoing");
  assert.equal(
    result.plan.assignments.filter(
      (a) => a.projectId === mixed.id && a.status === "planned",
    ).length,
    1,
  );
});
test("Excel full-plan round trip preserves allocations, capacities, overrides, IDs and notes", async () => {
  let p = clone(seed);
  p.people[1].capacityHours = 36;
  p.people[1].reservedHours = 4;
  p.people[1].notes = "Part-time project capacity";
  p.capacityOverrides.push({ personId: "person-2", week, hours: 0 });
  const a = p.assignments.find(
    (a) => a.personId === "person-2" && a.status === "ongoing",
  )!;
  p = setAllocation(p, a.id, addWeeks(week, 1), addWeeks(week, 2), 12.5);
  const bytes = await excelBuffer(p);
  const result = await importExcel(
    new File([bytes as BlobPart], "export.xlsx"),
  );
  assert.deepEqual(result.plan, p);
});
test("proposal decisions are project states and preserve assignment commitments", async () => {
  for (const status of [
    "proposal",
    "ongoing",
    "submitted",
    "granted",
    "rejected",
  ] as const) {
    const p = clone(seed);
    p.projects[0].status = status;
    assert.equal(validatePlan(p).projects[0].status, status);
    assert.deepEqual(assignmentCounts(p), assignmentCounts(seed));
    const bytes = await excelBuffer(p);
    const result = await importExcel(
      new File([bytes as BlobPart], "stages.xlsx"),
    );
    assert.equal(result.plan.projects[0].status, status);
  }
  const p = clone(seed);
  (p.projects[0] as { status: string }).status = "unsupported";
  assert.throws(() => validatePlan(p));
});

test("whole team joins an activity in one step and photos are validated", async () => {
  const p = clone(seed);
  const project = p.projects[0];
  const before = p.assignments.filter((a) => a.projectId === project.id).length;
  const added = addWholeTeam(p, project.id);
  assert.equal(added, p.people.length - before);
  assert.equal(p.assignments.filter((a) => a.projectId === project.id).length, p.people.length);
  assert.equal(addWholeTeam(p, project.id), 0);
  validatePlan(p);
  const q = clone(seed);
  q.people[0].photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  assert.equal(validatePlan(q).people[0].photo, q.people[0].photo);
  const bytes = await excelBuffer(q);
  const back = await importExcel(new File([bytes as BlobPart], "photo.xlsx"));
  assert.equal(back.plan.people[0].photo, q.people[0].photo);
  q.people[0].photo = "https://example.com/me.jpg";
  assert.throws(() => validatePlan(q));
  q.people[0].photo = "data:image/svg+xml;base64,PHN2Zz4=";
  assert.throws(() => validatePlan(q));
});

test("connections from the assignment dialog become shared work", async () => {
  const p = clone(seed);
  p.taskLibrary = [
    { id: "design", name: "Experiment design", category: "research", color: "blue" },
    { id: "clamp", name: "Clamping", category: "research", color: "green" },
  ] as never;
  const [A, B, C] = p.projects;
  p.assignments = p.assignments.filter((x) => ![A.id, B.id, C.id].includes(x.projectId));
  p.allocations = p.allocations.filter((x) => p.assignments.some((y) => y.id === x.assignmentId));
  const a1 = { id: "x1", personId: p.people[0].id, projectId: A.id, status: "ongoing" as const, estimated: false, notes: "", tasks: [{ taskId: "design" }] };
  const b1 = { id: "x2", personId: p.people[1].id, projectId: B.id, status: "ongoing" as const, estimated: false, notes: "", tasks: [{ taskId: "clamp" }] };
  p.assignments.push(a1, b1);
  applyConnections(p, "x1", [
    { taskId: "design", kind: "with", projectId: B.id, otherTaskId: "clamp" },
    { taskId: "design", kind: "waits", projectId: C.id },
  ]);
  const wid = a1.tasks[0].workItemId!;
  assert.ok(wid);
  assert.equal((b1.tasks[0] as { workItemId?: string }).workItemId, wid);
  const w = p.workItems!.find((x) => x.id === wid)!;
  assert.deepEqual(w.waitsOnProjects, [{ projectId: C.id }]);
  validatePlan(p);
  // Nobody holds the other task yet: it is kept as a link.
  applyConnections(p, "x1", [{ taskId: "design", kind: "with", projectId: C.id, otherTaskId: "clamp" }]);
  assert.deepEqual(p.workItems!.find((x) => x.id === wid)!.links, [{ projectId: C.id, taskId: "clamp" }]);
  assert.throws(() => applyConnections(p, "x1", [{ taskId: "design", kind: "with", projectId: A.id }]));
});

test("dependency map: connect, draw, remove", () => {
  const p = clone(seed);
  p.taskLibrary = [
    { id: "design", name: "Experiment design", category: "research", color: "blue" },
    { id: "clamp", name: "Clamping", category: "research", color: "green" },
  ] as never;
  p.workItems = [];
  p.assignments.forEach((a) => (a.tasks ?? []).forEach((t) => delete t.workItemId));
  const [A, B, C] = p.projects;
  p.assignments = p.assignments.filter((x) => ![A.id, B.id, C.id].includes(x.projectId));
  p.allocations = p.allocations.filter((x) => p.assignments.some((y) => y.id === x.assignmentId));
  const a1 = { id: "x1", personId: p.people[0].id, projectId: A.id, status: "ongoing" as const, estimated: false, notes: "", tasks: [{ taskId: "design" } as { taskId: string; workItemId?: string }] };
  p.assignments.push(a1);
  assert.equal(dependencyGraph(p, false).edges.length, 0);
  const wid = connectRefs(p, { projectId: A.id, taskId: "design" }, { projectId: B.id, taskId: "clamp" }, "with");
  assert.equal(a1.tasks[0].workItemId, wid);
  assert.deepEqual(p.workItems!.find((w) => w.id === wid)!.links, [{ projectId: B.id, taskId: "clamp" }]);
  // Same pair again reuses the item; waits-on joins the same item.
  assert.equal(connectRefs(p, { projectId: A.id, taskId: "design" }, { projectId: B.id, taskId: "clamp" }, "with"), wid);
  assert.equal(connectRefs(p, { projectId: A.id, taskId: "design" }, { projectId: C.id }, "waits"), wid);
  validatePlan(p);
  const g = dependencyGraph(p, false);
  assert.equal(g.edges.filter((e) => e.kind === "with").length, 1);
  const wait = g.edges.find((e) => e.kind === "waits")!;
  assert.equal(wait.to, `${C.id}|`);
  // One arrow per thing waited on, from the item's nearest box.
  assert.equal(g.edges.filter((e) => e.kind === "waits").length, 1);
  assert.deepEqual([...g.projects].sort(), [A.id, B.id, C.id].sort());
  assert.deepEqual(g.nodes[A.id], [`${A.id}|`, `${A.id}|design`]);
  removeWait(p, wait);
  assert.equal(dependencyGraph(p, false).edges.filter((e) => e.kind === "waits").length, 0);
  leaveWorkItem(p, wid, { projectId: B.id, taskId: "clamp" });
  assert.equal(dependencyGraph(p, false).edges.length, 0);
  assert.throws(() => connectRefs(p, { projectId: A.id }, { projectId: A.id, taskId: "clamp" }, "with"));
  validatePlan(p);
});

test("task groups on projects and detailed tasks under each group", () => {
  const p = clone(seed);
  const a = p.assignments[0];
  const pr = p.projects.find((x) => x.id === a.projectId)!;
  pr.taskGroups = ["t-writing", "t-measurement"];
  a.tasks = [
    {
      taskId: "t-writing",
      items: [
        { id: "i1", text: "Draft report for WP 2" },
        { id: "i2", text: "Abstract for euspen", done: true },
      ],
    },
  ];
  validatePlan(p);
  assert.deepEqual(itemCounts(a.tasks), { open: 1, done: 1 });
  assert.equal(toggleTaskItem(p, a.id, "t-writing", "i1"), true);
  assert.equal(toggleTaskItem(p, a.id, "t-writing", "i2"), false);
  assert.deepEqual(itemCounts(a.tasks), { open: 1, done: 1 });
  assert.equal(a.tasks[0].items![1].done, undefined);
  assert.deepEqual(parseItemLines("1. Draft report\n2) Abstract\n- SOP for profiler\n\n• Poster"), [
    "Draft report",
    "Abstract",
    "SOP for profiler",
    "Poster",
  ]);
  const bad = clone(p);
  bad.assignments[0].tasks![0].items![0].text = "  ";
  assert.throws(() => validatePlan(bad));
  const bad2 = clone(p);
  (bad2.projects.find((x) => x.id === a.projectId)! as { taskGroups: unknown }).taskGroups = "t-writing";
  assert.throws(() => validatePlan(bad2));
});

test("diff shown before overwriting an existing assignment", () => {
  const p = clone(seed);
  const a = p.assignments[0];
  a.status = "planned";
  a.notes = "";
  a.tasks = [
    { taskId: "t-writing", items: [{ id: "i1", text: "WP2 report" }, { id: "i2", text: "Abstract" }] },
    { taskId: "t-measurement" },
  ];
  const lines = assignmentDiff(p, a, {
    status: "ongoing",
    notes: "Lead author",
    tasks: [
      { taskId: "t-writing", items: [{ id: "x", text: "WP2 report", done: true }, { id: "y", text: "SOP" }] },
      { taskId: "t-analysis" },
    ],
  });
  const text = lines.map((l) => `${l.kind}:${l.text}`);
  assert.ok(text.includes("change:Status: Planned to Ongoing"));
  assert.ok(text.includes('add:Note added: "Lead author"'));
  assert.ok(text.includes("add:Task group Data analysis"));
  assert.ok(text.includes("remove:Task group Measurement"));
  assert.ok(text.includes('add:Writing: "SOP"'));
  assert.ok(text.includes('remove:Writing: "Abstract"'));
  assert.ok(text.includes('change:Writing: "WP2 report" marked done'));
  assert.deepEqual(assignmentDiff(p, a, { status: a.status, notes: "", tasks: a.tasks }), []);
});

test("project lists: types and funders come from Settings plus what projects use", () => {
  const p = clone(seed);
  p.projects[0].type = "Odd type";
  p.projects[0].funder = "Vinnova";
  assert.deepEqual(typeOptions(p).slice(0, DEFAULT_TYPES.length), DEFAULT_TYPES);
  assert.ok(typeOptions(p).includes("Odd type"));
  assert.ok(!typeFilterOptions(p).includes("Teaching") || p.projects.some((x) => x.type === "Teaching"));
  p.settings.projectTypes = ["Research", "Service"];
  assert.deepEqual(typeFilterOptions(p).slice(0, 2), ["Research", "Service"]);
  p.settings.funders = ["EU Horizon", "Vinnova"];
  assert.deepEqual(funderOptions(p).slice(0, 2), ["EU Horizon", "Vinnova"]);
  assert.equal(funderOptions(p).filter((x) => x === "Vinnova").length, 1);
  assert.deepEqual(cleanList([" A ", "a", "", "B  c"]), ["A", "B c"]);
  assert.equal(renameOnProjects(p, "funder", "Vinnova", "Vinnova AB"), 1);
  assert.equal(p.projects[0].funder, "Vinnova AB");
  validatePlan(p);
});

test("own stages work like a built-in stage and validate", () => {
  const p = clone(seed);
  p.settings.stages = [
    { id: "granted", label: "Funded" },
    { id: "s-neg", label: "Under negotiation", like: "submitted" },
  ];
  const defs = stageDefs(p);
  assert.equal(defs[0].id, "granted");
  assert.equal(defs[1].id, "s-neg");
  assert.equal(defs.length, 9);
  setStageNames(p);
  assert.equal(stageLabel("granted"), "Funded");
  assert.equal(stageLabel("proposal"), "Proposal");
  p.projects[0].status = "submitted";
  p.projects[0].stage = "s-neg";
  assert.equal(stageKey(p.projects[0]), "s-neg");
  validatePlan(p);
  const bad = clone(p);
  bad.projects[0].stage = "s-missing";
  assert.throws(() => validatePlan(bad));
  const bad2 = clone(p);
  bad2.settings.stages = [{ id: "s-x", label: "" , like: "submitted" }];
  assert.throws(() => validatePlan(bad2));
});

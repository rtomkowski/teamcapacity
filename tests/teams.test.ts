import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  clone,
  personLoad,
  validatePlan,
  workItemProjects,
  workItemUses,
  openBlockers,
  dependentsOf,
  wouldLoop,
  blockerLabels,
  currentEnd,
  periodsOf,
  scheduleSummary,
  scheduleWeekHours,
  scheduleDays,
  projectSegments,
  teamAbbr,
  teamFullName,
  type Plan,
} from "../src/model.ts";
import {
  addTeam,
  createTeamPlan,
  createWorkspace,
  restoreWorkspace,
  switchTeam,
  updateTeamPlan,
  validateWorkspace,
} from "../src/teams.ts";

const seed = JSON.parse(
  await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
) as Plan;
const week = "2026-11-16";

test("migration carries the user's saved single-team plan across without inventing data", () => {
  const legacy = clone(seed);
  legacy.people[0].capacityHours = 35;
  legacy.people[0].notes = "Existing saved edits";
  const workspace = restoreWorkspace(undefined, legacy, seed);
  assert.equal(workspace.teams.length, 1);
  assert.equal(workspace.teams[0].name, "My team");
  assert.equal(workspace.activeTeamId, workspace.teams[0].id);
  assert.deepEqual(workspace.teams[0].plan, legacy);
  workspace.teams[0].plan.people[0].name = "Changed";
  assert.notEqual(legacy.people[0].name, "Changed");
  assert.deepEqual(
    restoreWorkspace(undefined, undefined, seed).teams[0].plan,
    seed,
  );
});

test("dummy setup is a valid fresh plan with linked hours for the first four weeks", () => {
  const plan = createTeamPlan("sample", "2026-11-18");
  assert.deepEqual(validatePlan(plan), plan);
  assert.equal(plan.people.length, 3);
  assert.equal(plan.projects.length, 2);
  assert.equal(plan.assignments.length, 3);
  assert.equal(plan.allocations.length, 12);
  assert.deepEqual(
    [...new Set(plan.allocations.map((allocation) => allocation.week))],
    [week, "2026-11-23", "2026-11-30", "2026-12-07"],
  );
  const load = personLoad(plan, plan.people[0].id, week);
  assert.equal(load.capacity, 32);
  assert.equal(load.committed, 16);
  assert.equal(load.missing, 0);
  assert.equal(personLoad(plan, plan.people[2].id, week).tentative, 8);
  const another = createTeamPlan("sample", week);
  const ids = new Set(
    [
      ...plan.people,
      ...plan.projects,
      ...plan.assignments,
      ...plan.allocations,
    ].map((item) => item.id),
  );
  assert.ok(
    [
      ...another.people,
      ...another.projects,
      ...another.assignments,
      ...another.allocations,
    ].every((item) => !ids.has(item.id)),
  );
});

test("empty setup contains no imported or dummy records", () => {
  const plan = createTeamPlan("empty", week);
  assert.deepEqual(validatePlan(plan), plan);
  for (const key of [
    "people",
    "projects",
    "assignments",
    "allocations",
    "capacityOverrides",
  ] as const)
    assert.deepEqual(plan[key], []);
});

test("rapid edits, creation and switching retain each team's independent plan", () => {
  const original = createWorkspace(seed);
  const edited = clone(seed);
  edited.people[0].notes = "Unsaved edit immediately before switching";
  let workspace = updateTeamPlan(original, edited);
  workspace = addTeam(workspace, " Research ", "sample", week);
  const researchId = workspace.activeTeamId;
  assert.equal(workspace.teams[1].name, "Research");
  const research = clone(workspace.teams[1].plan);
  research.people[0].name = "Research member";
  research.settings.weekCount = 4;
  workspace = updateTeamPlan(workspace, research);
  workspace = switchTeam(workspace, original.activeTeamId);
  assert.deepEqual(workspace.teams[0].plan, edited);
  assert.deepEqual(original.teams[0].plan, seed);
  workspace = switchTeam(workspace, researchId);
  assert.deepEqual(workspace.teams[1].plan, research);
  workspace = addTeam(workspace, "Empty team", "empty", week);
  assert.equal(workspace.teams.length, 3);
  assert.equal(workspace.teams[2].plan.people.length, 0);
  assert.deepEqual(workspace.teams[0].plan, edited);
  assert.deepEqual(workspace.teams[1].plan, research);
  assert.throws(() => switchTeam(workspace, "missing"));
});

test("team names reject blank, too long and case-insensitive duplicates", () => {
  const workspace = createWorkspace(seed);
  for (const name of ["", "  ", "a".repeat(81), " MY TEAM "])
    assert.throws(() => addTeam(workspace, name, "empty", week));
  assert.equal(workspace.teams.length, 1);
});

test("workspace backup restores every team and the active selection instead of legacy data", () => {
  const workspace = addTeam(createWorkspace(seed), "Research", "sample", week);
  const backup = JSON.parse(JSON.stringify(workspace));
  assert.deepEqual(restoreWorkspace(backup, seed, seed), workspace);
  const restored = validateWorkspace(backup);
  restored.teams[1].plan.people[0].name = "Independent copy";
  assert.notEqual(backup.teams[1].plan.people[0].name, "Independent copy");
});

test("invalid workspace backups fail without silently falling back to the seed", () => {
  const workspace = addTeam(createWorkspace(seed), "Research", "sample", week);
  const invalid = [
    { ...workspace, version: 2 },
    { ...workspace, teams: [] },
    { ...workspace, activeTeamId: "missing" },
    { ...workspace, teams: [...workspace.teams, workspace.teams[0]] },
    {
      ...workspace,
      teams: [
        workspace.teams[0],
        { ...workspace.teams[1], name: " my TEAM " },
      ],
    },
    { ...workspace, teams: [{ ...workspace.teams[0], plan: {} }] },
    { ...workspace, teams: [null] },
  ];
  for (const value of invalid) {
    assert.throws(() => validateWorkspace(value));
    assert.throws(() => restoreWorkspace(value, seed, seed));
  }
  assert.throws(() => restoreWorkspace(undefined, {}, seed));
});

test("optional person and project details survive validation and reject bad years", () => {
  const plan = createTeamPlan("sample", "2026-11-16");
  const ok = validatePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(ok.people[0].role, "Researcher");
  assert.equal(ok.projects[0].type, "Research");
  assert.equal(ok.projects[0].startYear, 2026);
  const bad = JSON.parse(JSON.stringify(plan));
  bad.projects[0].startYear = 2030;
  bad.projects[0].endYear = 2028;
  assert.throws(() => validatePlan(bad), /project details/);
  const old = JSON.parse(JSON.stringify(plan));
  for (const p of old.people) delete p.role;
  for (const p of old.projects)
    for (const k of ["type", "funder", "startYear", "endYear", "description"]) delete p[k];
  assert.doesNotThrow(() => validatePlan(old));
});

test("activities count against capacity and notes survive validation", () => {
  const plan = createTeamPlan("sample", week);
  const person = plan.people[0];
  plan.projects.push({ id: "teach", name: "Course X", status: "ongoing", notes: "", kind: "teaching" });
  plan.assignments.push({ id: "a-teach", personId: person.id, projectId: "teach", status: "ongoing", estimated: true, notes: "Examiner" });
  plan.allocations.push({ id: "al-teach", assignmentId: "a-teach", week, hours: 6, note: "Exam marking" });
  plan.capacityOverrides.push({ personId: person.id, week, hours: 30, note: "Conference" });
  const ok = validatePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(ok.projects.at(-1)!.kind, "teaching");
  assert.equal(ok.allocations.at(-1)!.note, "Exam marking");
  assert.equal(ok.capacityOverrides[0].note, "Conference");
  const l = personLoad(ok, person.id, week);
  assert.equal(l.capacity, 30);
  assert.equal(l.total, 16 + 6);
  const bad = JSON.parse(JSON.stringify(plan));
  bad.projects.at(-1).kind = "holiday";
  assert.throws(() => validatePlan(bad), /project details/);
});

test("tasks, task library, status and capacity tracking validate and default sensibly", async () => {
  const { taskLibrary, tracksCapacity, DEFAULT_TASKS } = await import("../src/model.ts");
  const plan = createTeamPlan("sample", week);
  assert.equal(tracksCapacity(plan), false);
  assert.deepEqual(taskLibrary(plan), DEFAULT_TASKS);
  plan.assignments[0].tasks = [{ taskId: "t-measurement", note: "Sa on batch 3" }, { taskId: "t-analysis" }];
  plan.people[0].status = "full";
  plan.people[0].statusNote = "Until March";
  plan.settings.capacityTracking = true;
  plan.taskLibrary = [...DEFAULT_TASKS, { id: "t-x", name: "Field trip", color: "rose" }];
  const ok = validatePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(ok.assignments[0].tasks!.length, 2);
  assert.equal(tracksCapacity(ok), true);
  assert.equal(taskLibrary(ok).at(-1)!.name, "Field trip");
  const bad1 = JSON.parse(JSON.stringify(plan));
  bad1.people[0].status = "drowning";
  assert.throws(() => validatePlan(bad1), /status/);
  const bad2 = JSON.parse(JSON.stringify(plan));
  bad2.taskLibrary.push({ id: "t-x", name: "Duplicate id" });
  assert.throws(() => validatePlan(bad2), /task library/);
  const bad3 = JSON.parse(JSON.stringify(plan));
  bad3.taskLibrary[0].color = "#ff0000";
  assert.throws(() => validatePlan(bad3), /task library/);
});

test("shared work items link tasks across projects and reject loops", async () => {
  const seed = JSON.parse(
    await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
  ) as Plan;
  const plan = clone(seed);
  const [a1, a2] = plan.assignments.filter(
    (a, i, all) => all.findIndex((b) => b.projectId === a.projectId) === i,
  );
  plan.workItems = [
    { id: "w-fix", name: "Fixture", status: "done" },
    { id: "w-batch", name: "Test piece batch A", status: "active", waitsOn: ["w-fix"] },
    { id: "w-lib", name: "Defect library", status: "planned", waitsOn: ["w-batch"] },
  ];
  a1.tasks = [{ taskId: "t-machining", workItemId: "w-batch" }];
  a2.tasks = [{ taskId: "t-measurement", note: "Sa, Sq", workItemId: "w-batch" }];
  const ok = validatePlan(plan);
  assert.deepEqual(workItemProjects(ok, "w-batch"), [a1.projectId, a2.projectId]);
  assert.equal(workItemUses(ok, "w-batch").length, 2);
  const items = ok.workItems!;
  assert.deepEqual(openBlockers(ok, items[2]).map((w) => w.id), ["w-batch"]);
  assert.equal(openBlockers(ok, items[1]).length, 0, "done items do not block");
  assert.deepEqual(dependentsOf(ok, "w-batch").map((w) => w.id), ["w-lib"]);
  assert.equal(wouldLoop(items, "w-fix", "w-lib"), true);
  const loop = clone(plan);
  loop.workItems![0].waitsOn = ["w-lib"];
  assert.throws(() => validatePlan(loop), /waits on/);
  const missing = clone(plan);
  missing.assignments.find((a) => a.id === a1.id)!.tasks![0].workItemId = "w-none";
  assert.throws(() => validatePlan(missing));
});

test("project dates, extensions and timeline segments", async () => {
  const seed = JSON.parse(
    await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
  ) as Plan;
  const plan = clone(seed);
  const p = plan.projects[0];
  p.status = "ongoing";
  p.dates = { appStart: "2025-01-10", appDue: "2025-03-01", start: "2025-09-01", end: "2027-08-31" };
  p.extensions = [{ id: "x-1", end: "2028-02-29", note: "No-cost" }];
  p.dateLog = [{ on: "2026-11-17", field: "Extension 1", to: "2028-02-29" }];
  const ok = validatePlan(plan);
  const q = ok.projects[0];
  assert.equal(currentEnd(q), "2028-02-29");
  assert.deepEqual(
    projectSegments(q).map((s) => s.kind),
    ["prep", "wait", "active", "extension"],
  );
  // Years only become an approximate bar.
  const y = clone(seed).projects[0];
  delete y.dates;
  y.startYear = 2026;
  y.endYear = 2027;
  assert.equal(projectSegments(y)[0].approx, true);
  // An extension must end after the contract end.
  const bad = clone(plan);
  bad.projects[0].extensions = [{ id: "x-1", end: "2027-01-01" }];
  assert.throws(() => validatePlan(bad), /project dates/);
  const bad2 = clone(plan);
  bad2.projects[0].dates = { start: "2027-01-01", end: "2026-01-01" };
  assert.throws(() => validatePlan(bad2), /project dates/);
});

test("shared work links projects and tasks directly and waits on projects", async () => {
  const seed = JSON.parse(
    await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
  ) as Plan;
  const plan = clone(seed);
  const [p1, p2] = plan.projects;
  p1.status = "ongoing";
  plan.workItems = [
    {
      id: "w-a",
      name: "Batch A",
      status: "active",
      links: [{ projectId: p2.id, taskId: "t-measurement" }],
      waitsOnProjects: [{ projectId: p1.id }, { projectId: p1.id, taskId: "t-machining" }],
    },
  ];
  const ok = validatePlan(plan);
  assert.ok(workItemProjects(ok, "w-a").includes(p2.id));
  assert.equal(blockerLabels(ok, ok.workItems![0]).length, 2);
  ok.projects[0].status = "finished";
  assert.equal(blockerLabels(ok, ok.workItems![0]).length, 0);
  const bad = clone(plan);
  bad.workItems![0].links = [{ projectId: "missing" }];
  assert.throws(() => validatePlan(bad));
});

test("activity schedules: periods, recurring meetings, events and summaries", async () => {
  const seed = JSON.parse(
    await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8"),
  ) as Plan;
  const plan = clone(seed);
  plan.settings.periods = [
    { id: "p-1", name: "Period 1", start: "2026-08-31", end: "2026-10-30" },
    { id: "p-2", name: "Period 2", start: "2026-11-02", end: "2027-01-15" },
  ];
  const act = plan.projects[0];
  act.kind = "other";
  act.schedule = { mode: "recurring", freq: "weekly", weekdays: [0], start: "2026-08-31", from: "09:30", to: "09:50" };
  const ok = validatePlan(plan);
  const ps = periodsOf(ok);
  const pulse = ok.projects[0].schedule!;
  assert.equal(scheduleSummary(pulse, ps), "Every Monday 09:30 to 09:50");
  assert.equal(Math.round(scheduleWeekHours(pulse, ps, "2026-11-16") * 60), 20);
  const teach = { mode: "periods" as const, periodIds: ["p-2"], weekdays: [1, 3], from: "10:00", to: "12:00" };
  assert.equal(scheduleWeekHours(teach, ps, "2026-11-16"), 4);
  assert.equal(scheduleWeekHours(teach, ps, "2026-10-05"), 0, "outside the period");
  assert.equal(scheduleSummary(teach, ps), "Period 2 · Tue, Thu 10:00 to 12:00");
  const conf = { mode: "event" as const, start: "2027-05-17", end: "2027-05-19" };
  assert.equal(scheduleWeekHours(conf, ps, "2027-05-17"), 24);
  const fortnight = { mode: "recurring" as const, freq: "weekly" as const, interval: 2, start: "2026-11-02", from: "14:00", to: "15:00" };
  assert.equal(scheduleWeekHours(fortnight, ps, "2026-11-02"), 1);
  assert.equal(scheduleWeekHours(fortnight, ps, "2026-11-09"), 0);
  const monthly = { mode: "recurring" as const, freq: "monthly" as const, start: "2026-01-31", from: "15:00", to: "16:00" };
  assert.deepEqual(scheduleDays(monthly, ps, "2026-02-01", "2026-03-31").map((d) => d.date), ["2026-02-28", "2026-03-31"]);
  const bad = clone(plan);
  bad.projects[0].schedule = { mode: "once", start: "2026-12-03", from: "16:00", to: "13:00" };
  assert.throws(() => validatePlan(bad), /schedule/);
  const badPeriod = clone(plan);
  badPeriod.projects[0].schedule = { mode: "periods", periodIds: ["p-x"] };
  assert.throws(() => validatePlan(badPeriod), /schedule/);
});

test("demo team validates", async () => {
  const read = (rel: string) =>
    fs.readFile(new URL(rel, import.meta.url), "utf8").catch(() => "null");
  const demo = JSON.parse(
    (await read("../../demo-data/northfield-demo-team.json")) !== "null"
      ? await read("../../demo-data/northfield-demo-team.json")
      : await read("../../demo/northfield-demo-team.json"),
  );
  if (demo) validatePlan(demo);
});

test("team profile: abbreviation, full name and validation", async () => {
  const plan = createTeamPlan("empty");
  assert.equal(teamAbbr(plan, "PEM team"), "PEM team");
  assert.equal(teamFullName(plan, "PEM team"), "PEM team");
  const withProfile = validatePlan({
    ...plan,
    profile: { abbreviation: "PEM", fullName: "Precision Engineering and Metrology", focus: ["Surface metrology"], leadId: "gone" },
  });
  assert.equal(teamAbbr(withProfile, "PEM team"), "PEM");
  assert.equal(teamFullName(withProfile, "PEM team"), "Precision Engineering and Metrology");
  assert.throws(() => validatePlan({ ...plan, profile: { abbreviation: "X".repeat(13) } }), /profile/);
  assert.throws(() => validatePlan({ ...plan, profile: { focus: "Metrology" } }), /profile/);
  assert.throws(() => validatePlan({ ...plan, profile: [] }), /profile/);
});

test("person card: rows per project with tasks, escaped HTML and Excel", async () => {
  const { personCard, cardHtml, cardExcelBuffer } = await import("../src/card.ts");
  const seed = JSON.parse(await fs.readFile(new URL("./fixtures/sample-plan.json", import.meta.url), "utf8")) as Plan;
  const plan = clone(seed);
  const a = plan.assignments.find((x) => x.status !== "finished")!;
  a.tasks = [{ taskId: "measurement", note: "Ra & Sa <batch 2>" }];
  plan.profile = { abbreviation: "PEM", fullName: "Precision Engineering and Metrology" };
  const card = personCard(plan, a.personId, "PEM team", new Date("2026-11-18T12:00:00"));
  assert.equal(card.team, "PEM");
  const row = card.rows.find((r) => r.project === plan.projects.find((p) => p.id === a.projectId)!.name)!;
  assert.ok(row.tasks.length === 1);
  const html = cardHtml(card);
  assert.match(html, /Ra &amp; Sa &lt;batch 2&gt;/);
  assert.doesNotMatch(html, /<batch 2>/);
  const buf = await cardExcelBuffer(card);
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as ArrayBuffer);
  assert.ok(wb.getWorksheet("Projects and tasks")!.rowCount >= 2);
  plan.settings.capacityTracking = true;
  const tracked = personCard(plan, a.personId, "PEM team", new Date("2026-11-18T12:00:00"));
  assert.ok(tracked.capacity && Array.isArray(tracked.weeks));
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load((await cardExcelBuffer(tracked)) as ArrayBuffer);
  assert.ok(wb2.getWorksheet("Planned hours"));
});

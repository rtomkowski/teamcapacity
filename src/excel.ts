import { type Plan, type Status, kindLabels, kindOf, rolesText } from "./model.ts";
import { uid, validatePlan } from "./model.ts";
import { download } from "./storage.ts";
type ExcelCell = unknown;
function cellText(value: ExcelCell): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("richText" in value)
      return (value.richText as { text: string }[]).map((v) => v.text).join("");
    if ("text" in value) return String(value.text);
    if ("formula" in value || "sharedFormula" in value) return "";
  }
  return String(value).trim();
}
export async function importExcel(
  file: File,
): Promise<{ plan: Plan; warnings: string[] }> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Please use a workbook smaller than 20 MB.");
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const embedded = workbook.getWorksheet("PEM App Data");
  if (embedded) {
    const chunks: string[] = [];
    for (let r = 2; r <= embedded.rowCount; r++)
      chunks.push(cellText(embedded.getCell(r, 1).value));
    return {
      plan: validatePlan(JSON.parse(chunks.join(""))),
      warnings: [
        "This workbook includes a complete Team capacity plan, including weekly allocations and capacity.",
      ],
    };
  }
  const sheet =
    workbook.getWorksheet("Engagement") ??
    workbook.worksheets.find(
      (s) =>
        s.getRow(3).values &&
        cellText(s.getCell(3, 1).value).toLowerCase() === "team member",
    );
  if (!sheet)
    throw new Error(
      "No Engagement sheet found. Use the original workbook or an app export.",
    );
  const plan: Plan = {
    version: 1,
    people: [],
    projects: [],
    assignments: [],
    allocations: [],
    capacityOverrides: [],
    settings: { weekCount: 8 },
    source: file.name,
  };
  const warnings: string[] = [];
  const peopleByRow = new Map<number, string>();
  let header = 0;
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++)
    if (cellText(sheet.getCell(r, 1).value).toLowerCase() === "team member") {
      header = r;
      break;
    }
  if (!header) throw new Error("Cannot find the Team member header.");
  let firstProject = 6;
  for (let c = 2; c <= sheet.columnCount; c++)
    if (cellText(sheet.getCell(header, c).value) === "# Projects in Planning") {
      firstProject = c + 1;
      break;
    }
  for (let r = header + 1; r <= sheet.rowCount; r++) {
    const name = cellText(sheet.getCell(r, 1).value);
    if (!name || /^(People per project|To add projects|Edit:)/i.test(name))
      continue;
    if (plan.people.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      throw new Error(
        `Duplicate person name: ${name}. Rename it in Excel before importing.`,
      );
    const id = uid();
    plan.people.push({
      id,
      name,
      capacityHours: null,
      reservedHours: 0,
      notes: "",
    });
    peopleByRow.set(r, id);
  }
  for (let c = firstProject; c <= sheet.columnCount; c++) {
    const name = cellText(sheet.getCell(header, c).value);
    const marks = [...peopleByRow.keys()].map((r) =>
      cellText(sheet.getCell(r, c).value).toLowerCase(),
    );
    if (!name || name.toUpperCase() === "EMPTY PROJECT") {
      if (marks.some(Boolean))
        throw new Error(
          `Assignments found under an unnamed or placeholder project in column ${c}. Name this project before importing.`,
        );
      continue;
    }
    if (plan.projects.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      throw new Error(
        `Duplicate project name: ${name}. Rename it in Excel before importing.`,
      );
    const id = uid();
    const status = marks.includes("x")
      ? "ongoing"
      : marks.includes("p")
        ? "planned"
        : marks.includes("d")
          ? "finished"
          : "unspecified";
    plan.projects.push({ id, name, status, notes: "" });
    for (const [r, personId] of peopleByRow) {
      const mark = cellText(sheet.getCell(r, c).value).toLowerCase();
      if (!mark) continue;
      if (!["x", "p", "d"].includes(mark))
        throw new Error(
          `Unknown assignment value “${mark}” at row ${r}, column ${c}. Use x, p, d, or blank.`,
        );
      plan.assignments.push({
        id: uid(),
        personId,
        projectId: id,
        status: (
          { x: "ongoing", p: "planned", d: "finished" } as Record<
            string,
            Status
          >
        )[mark],
        estimated: mark === "d",
        notes: "",
      });
    }
  }
  if (!plan.people.length || !plan.projects.length)
    throw new Error("No people or projects found.");
  warnings.push(
    "Hours, capacity and dates are not present in the source workbook. Active assignments will be unestimated.",
    "Project stages were inferred from assignment marks. Individual assignment states are preserved.",
  );
  return { plan: validatePlan(plan), warnings };
}
export async function excelBuffer(plan: Plan) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Team capacity";
  const sheet = wb.addWorksheet("Engagement");
  sheet.addRow(["Team engagement matrix"]);
  sheet.addRow([
    "x = ongoing, p = planned, d = finished. Full app data is included in PEM App Data.",
  ]);
  sheet.addRow([
    "Team member",
    "# Total",
    "# Ongoing Projects",
    "# Finished projects",
    "# Projects in Planning",
    ...plan.projects.map((p) => p.name),
  ]);
  for (const p of plan.people) {
    const all = plan.assignments.filter((a) => a.personId === p.id);
    sheet.addRow([
      p.name,
      all.length,
      all.filter((a) => a.status === "ongoing").length,
      all.filter((a) => a.status === "finished").length,
      all.filter((a) => a.status === "planned").length,
      ...plan.projects.map((project) => {
        const a = all.find((a) => a.projectId === project.id);
        return a ? { ongoing: "x", planned: "p", finished: "d" }[a.status] : "";
      }),
    ]);
  }
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];
  sheet.getColumn(1).width = 28;
  for (let c = 2; c <= sheet.columnCount; c++)
    sheet.getColumn(c).width = c <= 5 ? 13 : 24;
  const people = wb.addWorksheet("People");
  people.addRow(["Name", "Weekly working hours", "Reserved hours", "Notes", "Role"]);
  plan.people.forEach((p) =>
    people.addRow([p.name, p.capacityHours, p.reservedHours, p.notes, p.role ?? ""]),
  );
  const projects = wb.addWorksheet("Projects");
  projects.addRow([
    "Project",
    "Status",
    "Notes",
    "Kind",
    "Type",
    "Funder",
    "Start year",
    "End year",
    "Description",
    "Roles",
  ]);
  plan.projects.forEach((p) =>
    projects.addRow([
      p.name,
      p.status,
      p.notes,
      kindLabels[kindOf(p)],
      p.type ?? "",
      p.funder ?? "",
      p.startYear ?? null,
      p.endYear ?? null,
      p.description ?? "",
      rolesText(plan, p),
    ]),
  );
  const points = wb.addWorksheet("Milestones and deadlines");
  points.addRow(["Project", "Kind", "Date", "Title", "Done", "Note", "Moved from", "First date"]);
  plan.projects.forEach((p) =>
    [...(p.milestones ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((m) =>
        points.addRow([p.name, m.kind === "deadline" ? "Deadline" : "Milestone", m.date, m.title, m.done ? "Yes" : "", m.note ?? "", m.movedFrom ?? "", m.originalDate ?? ""]),
      ),
  );
  const allocations = wb.addWorksheet("Weekly allocations");
  allocations.addRow(["Person", "Project", "Status", "Week starting", "Hours", "Note"]);
  plan.allocations.forEach((a) => {
    const ass = plan.assignments.find((x) => x.id === a.assignmentId)!;
    allocations.addRow([
      plan.people.find((p) => p.id === ass.personId)?.name,
      plan.projects.find((p) => p.id === ass.projectId)?.name,
      ass.status,
      a.week,
      a.hours,
      a.note ?? "",
    ]);
  });
  const overrides = wb.addWorksheet("Capacity adjustments");
  overrides.addRow(["Person", "Week starting", "Available project hours", "Reason"]);
  plan.capacityOverrides.forEach((o) =>
    overrides.addRow([
      plan.people.find((p) => p.id === o.personId)?.name,
      o.week,
      o.hours,
      o.note ?? "",
    ]),
  );
  for (const s of [sheet, people, projects, points, allocations, overrides]) {
    const row = s.getRow(s === sheet ? 3 : 1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF152A3D" },
    };
    row.height = 30;
    s.eachRow((r) => {
      r.alignment = { vertical: "middle", wrapText: true };
    });
    if (s !== sheet) s.columns.forEach((c, i) => (c.width = i < 2 ? 30 : 24));
  }
  const meta = wb.addWorksheet("PEM App Data");
  meta.addRow(["PEM_CAPACITY_V1"]);
  const json = JSON.stringify(plan);
  for (let i = 0; i < json.length; i += 30000)
    meta.addRow([json.slice(i, i + 30000)]);
  meta.state = "veryHidden";
  return wb.xlsx.writeBuffer();
}
export async function exportExcel(plan: Plan) {
  const buffer = await excelBuffer(plan);
  download(
    buffer as BlobPart,
    `pem-capacity-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

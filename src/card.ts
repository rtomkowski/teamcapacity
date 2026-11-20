// One person's card: a printable one-page profile (save as PDF) and an Excel file.
import {
  type Plan,
  type Project,
  addWeeks,
  currentEnd,
  isActivity,
  isPhoto,
  kindLabels,
  kindOf,
  monday,
  periodsOf,
  personLoad,
  personStatusLabels,
  scheduleSummary,
  taskLibrary,
  teamAbbr,
  teamFullName,
  tracksCapacity,
  workItemsOf,
  milestonesOf,
  movedText,
  rolesText,
  involvement,
  personInvolvement,
} from "./model.ts";
import { download } from "./storage.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const day = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const STAGE: Record<string, string> = {
  proposal: "Proposal",
  submitted: "Submitted",
  granted: "Granted",
  ongoing: "Ongoing",
  rejected: "Rejected",
  planned: "Planned",
  finished: "Finished",
  unspecified: "Stage not set",
};
const ASSIGNMENT: Record<string, string> = { ongoing: "Ongoing", planned: "Planned", finished: "Finished" };

/** "Sep 2025 to Feb 2028 (extended)", a schedule summary, or years. */
export function periodText(plan: Plan, p: Project): string {
  if (isActivity(p) && p.schedule) return scheduleSummary(p.schedule, periodsOf(plan));
  const d = p.dates ?? {};
  const end = currentEnd(p);
  const ext = p.extensions?.length ? " (extended)" : "";
  if (d.start && end) return `${month(d.start)} to ${month(end)}${ext}`;
  if (d.plannedStart && d.plannedEnd) return `${month(d.plannedStart)} to ${month(d.plannedEnd)} (proposed)`;
  if (p.startYear != null || p.endYear != null)
    return p.startYear === p.endYear || p.endYear == null || p.startYear == null
      ? String(p.startYear ?? p.endYear)
      : `${p.startYear} to ${p.endYear}`;
  return "";
}

export interface CardRow {
  project: string;
  kind: string;
  stage: string;
  funder: string;
  /** People in roles, e.g. "PI Maja Lindqvist" or "Course responsible Tomas Berg" (v26). */
  roles?: string;
  period: string;
  myStatus: string;
  tasks: { name: string; note?: string; shared?: string; items?: { text: string; done?: boolean }[] }[];
  notes: string;
  /** Involvement in percent of full time (v28). */
  percent?: number;
  hoursAhead?: number;
  /** The project's milestones and deadlines, in date order (v21). */
  points?: { kind: "Milestone" | "Deadline"; date: string; title: string; done: boolean; note?: string; moved?: string }[];
}
export interface PersonCard {
  team: string;
  teamFull: string;
  name: string;
  role: string;
  /** Data URL, already validated by the plan. */
  photo?: string;
  status: string;
  statusNote: string;
  notes: string;
  exported: string;
  track: boolean;
  /** "85% of full time across 4 projects (full plate at 100%)" (v28). */
  involvement?: string;
  capacity?: string;
  rows: CardRow[];
  weeks?: { week: string; project: string; hours: number; note: string }[];
}

/** Everything on a person's card, in plain values. Finished assignments last. */
export function personCard(plan: Plan, personId: string, teamName: string, today = new Date()): PersonCard {
  const person = plan.people.find((p) => p.id === personId);
  if (!person) throw new Error("Person not found.");
  const lib = taskLibrary(plan);
  const items = workItemsOf(plan);
  const track = tracksCapacity(plan);
  const week0 = monday(today);
  const horizon = addWeeks(week0, 8);
  const order = { ongoing: 0, planned: 1, finished: 2 } as Record<string, number>;
  const mine = plan.assignments
    .filter((a) => a.personId === personId)
    .map((a) => ({ a, p: plan.projects.find((x) => x.id === a.projectId)! }))
    .filter((x) => x.p)
    .sort((x, y) => order[x.a.status] - order[y.a.status] || x.p.name.localeCompare(y.p.name));
  const rows: CardRow[] = mine.map(({ a, p }) => {
    const row: CardRow = {
      project: p.name,
      kind: isActivity(p) ? kindLabels[kindOf(p)] : p.type || "Research project",
      stage: STAGE[p.status] ?? p.status,
      funder: p.funder ?? "",
      roles: rolesText(plan, p),
      period: periodText(plan, p),
      myStatus: ASSIGNMENT[a.status],
      tasks: (a.tasks ?? []).map((t) => ({
        name: lib.find((x) => x.id === t.taskId)?.name ?? "Task",
        note: t.note || undefined,
        shared: t.workItemId ? items.find((w) => w.id === t.workItemId)?.name : undefined,
        items: t.items?.length ? t.items.map((i) => ({ text: i.text, done: !!i.done })) : undefined,
      })),
      notes: a.notes ?? "",
    };
    const pct = involvement(a);
    if (pct !== undefined) row.percent = pct;
    const pts = milestonesOf(p);
    if (pts.length)
      row.points = pts.map((m) => ({
        kind: m.kind === "deadline" ? "Deadline" : "Milestone",
        date: m.date,
        title: m.title,
        done: !!m.done,
        ...(m.note ? { note: m.note } : {}),
        ...(m.movedFrom ? { moved: movedText(m, day) } : {}),
      }));
    if (track)
      row.hoursAhead = plan.allocations
        .filter((x) => x.assignmentId === a.id && x.week >= week0 && x.week < horizon)
        .reduce((s, x) => s + x.hours, 0);
    return row;
  });
  const card: PersonCard = {
    team: teamAbbr(plan, teamName),
    teamFull: teamFullName(plan, teamName),
    name: person.name,
    ...(isPhoto(person.photo) ? { photo: person.photo } : {}),
    role: person.role ?? "",
    status: track ? "" : person.status ? personStatusLabels[person.status] : "",
    statusNote: person.statusNote ?? "",
    notes: person.notes ?? "",
    exported: day(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`),
    track,
    rows,
  };
  const inv = personInvolvement(plan, personId);
  if (inv.parts.length)
    card.involvement = `${Math.round(inv.total)}% of full time across ${inv.parts.length} ${inv.parts.length === 1 ? "project" : "projects"} (full plate at ${inv.level}%${inv.over ? ", above it" : ""})`;
  if (track) {
    const l = personLoad(plan, personId, week0);
    card.capacity =
      person.capacityHours == null
        ? "Capacity not set"
        : `${person.capacityHours} h/week, ${person.reservedHours} h reserved; this week ${l.total} h planned`;
    const ids = new Set(mine.map((x) => x.a.id));
    card.weeks = plan.allocations
      .filter((x) => ids.has(x.assignmentId) && x.week >= week0 && x.week < horizon && x.hours > 0)
      .map((x) => ({
        week: x.week,
        project: mine.find((m) => m.a.id === x.assignmentId)!.p.name,
        hours: x.hours,
        note: x.note ?? "",
      }))
      .sort((x, y) => x.week.localeCompare(y.week) || x.project.localeCompare(y.project));
  }
  return card;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Up to 8 points under the period: open ones first in date order, then the latest done. */
function pointsHtml(r: CardRow): string {
  if (!r.points?.length) return "";
  const open = r.points.filter((x) => !x.done);
  const done = r.points.filter((x) => x.done);
  const shown = [...open, ...done.slice(-Math.max(0, 8 - open.length))].slice(0, 8);
  const more = r.points.length - shown.length;
  return `<ul class="points">${shown
    .map(
      (x) =>
        `<li class="${x.kind.toLowerCase()}${x.done ? " done" : ""}"><span class="sym">${x.kind === "Deadline" ? "⚑" : "◆"}</span> ${esc(day(x.date))}: ${esc(x.title)}${x.moved && !x.done ? ` <span class="moved">(${esc(x.moved.toLowerCase())})</span>` : ""}</li>`,
    )
    .join("")}${more > 0 ? `<li class="muted">and ${more} more</li>` : ""}</ul>`;
}

/** A standalone, light, A4 page for printing or saving as PDF. */
export function cardHtml(c: PersonCard): string {
  const active = c.rows.filter((r) => r.myStatus !== "Finished");
  const done = c.rows.filter((r) => r.myStatus === "Finished");
  const nTasks = active.reduce((s, r) => s + r.tasks.length, 0);
  const table = (rows: CardRow[]) => `
    <table>
      <thead><tr><th>Project or activity</th><th>Period</th><th>My part</th><th>Tasks</th>${c.track ? '<th class="num">Hours, next 8 weeks</th>' : ""}</tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr>
        <td><b>${esc(r.project)}</b><small>${esc([r.kind, r.stage, r.funder, r.roles].filter(Boolean).join(" · "))}</small></td>
        <td>${esc(r.period) || '<span class="muted">Not set</span>'}${pointsHtml(r)}</td>
        <td><span class="pill ${r.myStatus.toLowerCase()}">${r.myStatus}</span>${r.percent !== undefined ? ` <b>${r.percent}%</b>` : ""}${r.notes ? `<small>${esc(r.notes)}</small>` : ""}</td>
        <td>${
          r.tasks.length
            ? r.tasks
                .map(
                  (t) =>
                    `<span class="task">${esc(t.name)}</span>${t.note ? ` <small class="inline">${esc(t.note)}</small>` : ""}${t.shared ? `<small>Shared work: ${esc(t.shared)}</small>` : ""}${t.items?.length ? `<ol class="items">${t.items.map((i) => `<li${i.done ? ' class="done"' : ""}>${esc(i.text)}</li>`).join("")}</ol>` : ""}`,
                )
                .join('<span class="gap"></span>')
            : '<span class="muted">None</span>'
        }</td>
        ${c.track ? `<td class="num">${r.hoursAhead ? r.hoursAhead : ""}</td>` : ""}
      </tr>`,
        )
        .join("")}</tbody>
    </table>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)} · ${esc(c.team)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif; color: #1c1d22; margin: 0; padding: 24px; background: #fff; }
  header .photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; align-self: center; }
  header .who { flex: 1; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; border-bottom: 2px solid #3b5bdb; padding-bottom: 10px; margin-bottom: 14px; }
  .team { font-size: 9pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #3b5bdb; }
  h1 { font-size: 20pt; margin: 2px 0 0; }
  .role { color: #555a66; font-size: 11pt; }
  .meta { text-align: right; font-size: 9pt; color: #6b7080; }
  .summary { display: flex; gap: 18px; flex-wrap: wrap; margin: 0 0 12px; font-size: 10pt; }
  .summary b { font-size: 13pt; margin-right: 4px; }
  .status { margin: 0 0 12px; padding: 8px 10px; border-radius: 6px; background: #f2f4fa; font-size: 10pt; }
  h2 { font-size: 11.5pt; margin: 16px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #6b7080; border-bottom: 1px solid #c9ccd6; padding: 5px 6px; }
  td { vertical-align: top; border-bottom: 1px solid #e6e8ee; padding: 6px; }
  tr { break-inside: avoid; }
  td small { display: block; color: #6b7080; font-size: 8.5pt; }
  td small.inline { display: inline; }
  .num { text-align: right; white-space: nowrap; }
  ol.items { margin: 2px 0 4px 16px; padding: 0; font-size: 8.5pt; }
  ol.items li.done { text-decoration: line-through; color: #8a8f9c; }
  ul.points { list-style: none; margin: 4px 0 0; padding: 0; font-size: 8.5pt; }
  ul.points li { margin: 1px 0; }
  ul.points .sym { font-size: 8pt; }
  ul.points .milestone .sym { color: #12968a; } ul.points .deadline .sym { color: #d0661d; }
  ul.points .moved { color: #9a6a00; }
  ul.points li.done { text-decoration: line-through; color: #8a8f9c; }
  .task { display: inline-block; padding: 0 6px; border: 1px solid #c9ccd6; border-radius: 999px; font-size: 8.5pt; margin: 1px 0; }
  .pill { font-size: 8.5pt; font-weight: 600; }
  .pill.ongoing { color: #1f7a45; } .pill.planned { color: #9a6a00; } .pill.finished { color: #6b7080; }
  .muted { color: #8b8fa3; }
  .gap { display: block; height: 4px; }
  .notes { white-space: pre-wrap; font-size: 9.5pt; color: #33363f; }
  footer { margin-top: 18px; font-size: 8pt; color: #8b8fa3; }
  @media print { body { padding: 0; } }
</style></head><body>
<header>
  ${c.photo ? `<img class="photo" src="${c.photo}" alt="">` : ""}
  <div class="who">
    <div class="team">${esc(c.team)}${c.teamFull !== c.team ? ` · ${esc(c.teamFull)}` : ""}</div>
    <h1>${esc(c.name)}</h1>
    ${c.role ? `<div class="role">${esc(c.role)}</div>` : ""}
  </div>
  <div class="meta">Person card<br>${esc(c.exported)}</div>
</header>
<div class="summary">
  <span><b>${active.filter((r) => r.myStatus === "Ongoing").length}</b>ongoing</span>
  <span><b>${active.filter((r) => r.myStatus === "Planned").length}</b>planned</span>
  <span><b>${nTasks}</b>${nTasks === 1 ? "task" : "tasks"}</span>
  ${done.length ? `<span><b>${done.length}</b>finished</span>` : ""}
</div>
${c.status || c.statusNote ? `<div class="status"><b>${esc(c.status || "Status")}</b>${c.statusNote ? `: ${esc(c.statusNote)}` : ""}</div>` : ""}
${c.involvement ? `<div class="status"><b>Involvement</b>: ${esc(c.involvement)}</div>` : ""}
${c.capacity ? `<div class="status">${esc(c.capacity)}</div>` : ""}
<h2>Projects and activities</h2>
${active.length ? table(active) : '<p class="muted">No current projects or activities.</p>'}
${done.length ? `<h2>Finished</h2>${table(done)}` : ""}
${
  c.weeks && c.weeks.length
    ? `<h2>Planned hours, next 8 weeks</h2><table><thead><tr><th>Week starting</th><th>Project</th><th class="num">Hours</th><th>Note</th></tr></thead><tbody>${c.weeks
        .map((w) => `<tr><td>${esc(day(w.week))}</td><td>${esc(w.project)}</td><td class="num">${w.hours}</td><td>${esc(w.note)}</td></tr>`)
        .join("")}</tbody></table>`
    : ""
}
${c.notes ? `<h2>Notes</h2><div class="notes">${esc(c.notes)}</div>` : ""}
<footer>Exported from Team capacity. Choose "Save as PDF" in the print dialog to keep a PDF.</footer>
</body></html>`;
}

/** Opens the print dialog for the card (choose Save as PDF there). */
export function printCard(c: PersonCard) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(cardHtml(c));
  doc.close();
  const go = () => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 60000);
  };
  // Give the frame a moment to lay out (Safari needs it).
  setTimeout(go, 250);
}

export const cardFileName = (c: PersonCard, ext: string) =>
  `${c.team}-${c.name}`.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") + `-card.${ext}`;

/** An .xlsx with the person's profile, projects and tasks, and planned hours. */
export async function cardExcelBuffer(c: PersonCard) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Team capacity";
  const profile = wb.addWorksheet("Profile");
  profile.addRow(["Field", "Value"]);
  const fields: [string, string][] = [
    ["Name", c.name],
    ["Role", c.role],
    ["Team", c.teamFull !== c.team ? `${c.team} (${c.teamFull})` : c.team],
    ["Status", c.status],
    ["Status note", c.statusNote],
    ["Capacity", c.capacity ?? ""],
    ["Notes", c.notes],
    ["Exported", c.exported],
  ];
  fields.filter(([, v]) => v).forEach((f) => profile.addRow(f));
  const projects = wb.addWorksheet("Projects and tasks");
  projects.addRow([
    "Project or activity",
    "Kind or type",
    "Project stage",
    "Funder",
    "Roles",
    "Period or schedule",
    "My part",
    "Involvement %",
    "Task",
    "Task note",
    "Detailed tasks",
    "Shared work",
    "Assignment note",
    ...(c.track ? ["Hours, next 8 weeks"] : []),
  ]);
  for (const r of c.rows) {
    const tasks = r.tasks.length ? r.tasks : [{ name: "", note: undefined, shared: undefined }];
    tasks.forEach((t, i) =>
      projects.addRow([
        r.project,
        r.kind,
        r.stage,
        r.funder,
        r.roles ?? "",
        r.period,
        r.myStatus,
        i === 0 && r.percent !== undefined ? r.percent : "",
        t.name,
        t.note ?? "",
        ("items" in t && t.items ? t.items.map((x, k) => `${k + 1}. ${x.text}${x.done ? " (done)" : ""}`).join("\n") : ""),
        t.shared ?? "",
        i === 0 ? r.notes : "",
        ...(c.track ? [i === 0 ? r.hoursAhead ?? 0 : null] : []),
      ]),
    );
  }
  const sheets = [profile, projects];
  if (c.rows.some((r) => r.points?.length)) {
    const ms = wb.addWorksheet("Milestones and deadlines");
    ms.addRow(["Project or activity", "Kind", "Date", "Title", "Done", "Note", "Moved"]);
    for (const r of c.rows)
      for (const x of r.points ?? []) ms.addRow([r.project, x.kind, x.date, x.title, x.done ? "Yes" : "", x.note ?? "", x.moved ?? ""]);
    sheets.push(ms);
  }
  if (c.weeks) {
    const weeks = wb.addWorksheet("Planned hours");
    weeks.addRow(["Week starting", "Project", "Hours", "Note"]);
    c.weeks.forEach((w) => weeks.addRow([w.week, w.project, w.hours, w.note]));
    sheets.push(weeks);
  }
  for (const s of sheets) {
    const head = s.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF152A3D" } };
    head.height = 24;
    s.views = [{ state: "frozen", ySplit: 1 }];
    s.eachRow((row) => (row.alignment = { vertical: "top", wrapText: true }));
    s.columns.forEach((col, i) => (col.width = s === profile ? (i === 0 ? 16 : 70) : i === 0 ? 32 : 20));
  }
  if (c.rows.length) projects.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: projects.columnCount } };
  return wb.xlsx.writeBuffer();
}
export async function downloadCardExcel(c: PersonCard) {
  const buffer = await cardExcelBuffer(c);
  download(buffer as BlobPart, cardFileName(c, "xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

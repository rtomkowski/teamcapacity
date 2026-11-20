/**
 * Markwhen export of the project timeline (https://markwhen.com).
 * Plain text: one heading per kind, one sub-heading per project with tags for
 * stage, type and funder, then one line per period or milestone.
 */
import {
  type Plan,
  type Project,
  type Schedule,
  type TeachingPeriod,
  kinds,
  kindLabels,
  kindOf,
  isActivity,
  periodsOf,
  projectSegments,
  projectStageLabel,
  stageDefs,
  dateKey,
  addDays,
  milestonesOf,
} from "./model.ts";

/** Markwhen tags are word characters only: drop accents, join words with "_". */
export function mwTag(s: string): string {
  const t = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!t) return "";
  return /^\d+$/.test(t) ? `n${t}` : t;
}
/** Text for a heading or an event title: one line, no "#" (would start a tag). */
export function mwText(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/#/g, "No.")
    .replace(/^(\d)/, "​$1")
    .trim();
}
const tags = (...xs: (string | undefined)[]) =>
  [...new Set(xs.filter(Boolean).map((x) => mwTag(x!)).filter(Boolean))].map((x) => `#${x}`).join(" ");
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const range = (from: string, to: string) => (from === to ? from : `${from}/${to}`);
/** First day on or after `day` that falls on one of `weekdays` (0 = Monday). */
const firstOn = (day: string, weekdays: number[]) => {
  for (let i = 0; i < 7; i++) {
    const d = addDays(day, i);
    if (weekdays.includes((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7)) return d;
  }
  return day;
};
const timed = (day: string, sc: Schedule) =>
  sc.from && sc.to ? `${day} ${sc.from}/${day} ${sc.to}` : sc.from ? `${day} ${sc.from}` : day;

/** Lines for an activity's schedule (teaching periods, spans, meetings, events). */
function scheduleLines(p: Project, sc: Schedule, periods: TeachingPeriod[], base: string): string[] {
  const out: string[] = [];
  switch (sc.mode) {
    case "periods":
      for (const per of periods.filter((x) => sc.periodIds?.includes(x.id))) {
        const days = !sc.variableDays && sc.weekdays?.length ? sc.weekdays.map((i) => DAYS[i]).join(", ") : "";
        if (days && (sc.from || sc.to)) {
          out.push(`${timed(firstOn(per.start, sc.weekdays!), sc)} every week on ${days} until ${per.end}: ${mwText(per.name)} ${base}`.trim());
          if (sc.weekHours) out.push(`${sc.weekHours} h per week`);
        } else {
          out.push(`${range(per.start, per.end)}: ${mwText(per.name)} ${base}`.trim());
          if (days) out.push(`On ${days}`);
          if (sc.weekHours) out.push(`${sc.weekHours} h per week`);
          if (sc.variableDays) out.push(`Variable days${sc.from && sc.to ? `, ${sc.from} to ${sc.to}` : ""}`);
        }
      }
      break;
    case "span":
      if (sc.start) out.push(`${sc.end ? range(sc.start, sc.end) : `${sc.start}/now`}: ${mwText(p.name)} ${base}`.trim());
      break;
    case "once":
      if (sc.start) out.push(`${timed(sc.start, sc)}: ${mwText(p.name)} ${base}`.trim());
      break;
    case "event":
      if (sc.start) {
        const end = sc.end ?? sc.start;
        if (end !== sc.start && sc.from && sc.to) {
          const n = Math.round((Date.parse(end) - Date.parse(sc.start)) / 86400000) + 1;
          out.push(`${timed(sc.start, sc)} every day for ${n} times: ${mwText(p.name)} ${base}`.trim());
        } else if (end === sc.start) out.push(`${timed(sc.start, sc)}: ${mwText(p.name)} ${base}`.trim());
        else out.push(`${range(sc.start, end)}: ${mwText(p.name)} ${base}`.trim());
      }
      break;
    case "range":
      if (sc.start) {
        const a = sc.from ? `${sc.start} ${sc.from}` : sc.start;
        const end = sc.end ?? sc.start;
        const b = sc.to ? `${end} ${sc.to}` : end;
        out.push(`${a === b ? a : `${a}/${b}`}: ${mwText(p.name)} ${base}`.trim());
      }
      break;
    case "recurring":
      if (sc.start) {
        const n = sc.interval && sc.interval > 1 ? sc.interval : 1;
        const unit = sc.freq === "monthly" ? "month" : "week";
        let rule = n > 1 ? `every ${n} ${unit}s` : `every ${unit}`;
        const wd = unit === "week" && sc.weekdays?.length ? sc.weekdays : undefined;
        if (wd) rule += ` on ${wd.map((i) => DAYS[i]).join(", ")}`;
        // Open-ended series: stop half a year ahead, as the app's timeline does.
        const until = sc.end ?? addDays(sc.start > dateKey(new Date()) ? sc.start : dateKey(new Date()), 182);
        out.push(`${timed(wd ? firstOn(sc.start, wd) : sc.start, sc)} ${rule} until ${until}: ${mwText(p.name)} ${base}`.trim());
      }
      break;
  }
  return out;
}

/** The project's own milestones and deadlines, one line each, with an optional note below. */
function pointItems(p: Project): { day: string; lines: string[] }[] {
  return milestonesOf(p).map((m) => ({
    day: m.date,
    lines: [
      `${m.date}: ${mwText(m.title)} ${m.kind === "deadline" ? "#Deadline" : "#Milestone"}${m.done ? " #Done" : ""}`,
      ...(m.note ? [mwText(m.note)] : []),
      ...(m.movedFrom ? [mwText(`Moved from ${m.movedFrom}${m.originalDate && m.originalDate !== m.movedFrom ? `, originally ${m.originalDate}` : ""}`)] : []),
    ],
  }));
}
const inOrder = (items: { day: string; lines: string[] }[]) =>
  items.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)).flatMap((x) => x.lines);

/** Lines for a research project: application, proposal, contract, extensions and milestones. */
function projectLines(p: Project, periods: TeachingPeriod[]): string[] {
  const d = p.dates ?? {};
  const out: string[] = [];
  const seg = projectSegments(p, periods);
  const TAG: Record<string, string> = {
    prep: "Application",
    wait: "Waiting",
    proposed: "Proposed",
    active: "Contract",
    extension: "Extension",
  };
  // Periods and milestones in date order; a period's note stays under it.
  const items: { day: string; lines: string[] }[] = [];
  for (const s of seg) {
    const tag = s.approx ? "#Years_only" : `#${TAG[s.kind] ?? "Period"}`;
    items.push({ day: s.from, lines: [`${range(s.from, s.to)}: ${mwText(s.label)} ${tag}`, ...(s.note ? [mwText(s.note)] : [])] });
  }
  const decided =
    p.status === "rejected" ? "Decision: rejected" : ["granted", "ongoing", "finished"].includes(p.status) ? "Decision: granted" : "Decision";
  const ms: [string | undefined, string][] = [
    [d.appDue, p.status === "proposal" ? "Application deadline" : "Submitted"],
    [d.decisionOn, decided],
    [d.finishedOn, "Finished"],
    ...(p.extensions ?? []).map((x, i) => [x.approvedOn, `Extension ${i + 1} approved`] as [string | undefined, string]),
  ];
  for (const [day, label] of ms) if (day) items.push({ day, lines: [`${day}: ${label} #Milestone`] });
  items.push(...pointItems(p));
  out.push(...inOrder(items));
  return out;
}

const STAGE_COLOR: Record<string, string> = {
  proposal: "purple",
  submitted: "yellow",
  granted: "green",
  ongoing: "blue",
  rejected: "red",
  planned: "orange",
  finished: "gray",
  unspecified: "gray",
};

/**
 * The timeline as a Markwhen document. Projects without any dates are left out
 * and counted in a comment at the end.
 */
export function plansToMarkwhen(plan: Plan, list: Project[], opts: { title?: string; today?: string } = {}): string {
  const periods = periodsOf(plan);
  const today = opts.today ?? dateKey(new Date());
  const head: string[] = ["---", `title: ${mwText(opts.title ?? "Project timeline").replace(/:/g, " -")}`];
  head.push(`description: Exported from Team capacity on ${today}`);
  const colour = new Map<string, string>();
  for (const sd of stageDefs(plan)) {
    const t = mwTag(sd.label);
    if (t && !colour.has(t)) colour.set(t, STAGE_COLOR[sd.like ?? sd.id] ?? "gray");
  }
  for (const [t, c] of [
    ["Application", "purple"],
    ["Waiting", "gray"],
    ["Proposed", "indigo"],
    ["Contract", "blue"],
    ["Extension", "pink"],
    ["Milestone", "black"],
    ["Deadline", "orange"],
    ["Done", "gray"],
    ["Years_only", "gray"],
  ] as const)
    if (!colour.has(t)) colour.set(t, c);
  for (const [t, c] of colour) head.push(`#${t}: ${c}`);
  head.push("---", "");
  const body: string[] = [];
  const skipped: string[] = [];
  for (const k of kinds) {
    const inKind = list.filter((p) => kindOf(p) === k);
    if (!inKind.length) continue;
    const blocks: string[] = [];
    for (const p of inKind) {
      const stage = projectStageLabel(p);
      const groupTags = tags(stage, isActivity(p) ? undefined : p.type, p.funder);
      const lines = isActivity(p)
        ? [...(p.schedule ? scheduleLines(p, p.schedule, periods, "") : []), ...inOrder(pointItems(p))]
        : projectLines(p, periods);
      if (!lines.length) {
        skipped.push(p.name);
        continue;
      }
      blocks.push("", `## ${mwText(p.name)} ${groupTags}`.trim());
      if (p.description?.trim()) lines.splice(1, 0, mwText(p.description).slice(0, 400));
      blocks.push(...lines);
    }
    if (blocks.length) body.push(`# ${k === "project" ? "Research projects" : kindLabels[k]}`, ...blocks, "");
  }
  if (skipped.length) body.push(`// Not on the timeline (no dates yet): ${skipped.map(mwText).join(", ")}`);
  return [...head, ...body].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

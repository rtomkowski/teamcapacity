// Milestones and deadlines (v21): optional dated points within a project.
// Lists for the project overview, the Projects "Milestones" layout, Home and person panels,
// plus the editor rows used in the project dialog.
import React, { useContext, useState } from "react";
import { Diamond, Flag, Plus, X } from "lucide-react";
import {
  type Plan,
  type Project,
  type Milestone,
  type MilestoneEntry,
  type MilestoneKind,
  type MilestoneState,
  milestoneKinds,
  milestoneKindLabels,
  milestoneState,
  milestonesOf,
  teamMilestones,
  toggleMilestone,
  movedText,
  MILESTONE_TITLE_MAX,
  parseDate,
  uid,
} from "./model";
import { PatchContext } from "./views";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNum = (d: string) => Math.round(parseDate(d).getTime() / 86400000);
export const msDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const monthHead = (d: string) => `${MONTHS_LONG[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** "Today", "In 5 days", "3 days overdue" or "Done"; empty when far away. */
export function msWhen(m: Milestone, today: string): string {
  if (m.done) return "Done";
  const n = dayNum(m.date) - dayNum(today);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "1 day overdue";
  if (n < 0) return `${-n} days overdue`;
  if (n <= 60) return `In ${n} days`;
  return "";
}

export function MsIcon({ kind, size = 14 }: { kind: MilestoneKind; size?: number }) {
  return kind === "deadline" ? (
    <Flag size={size} className="ms-ico dl" aria-label="Deadline" />
  ) : (
    <Diamond size={size} className="ms-ico ms" aria-label="Milestone" />
  );
}

type OpenProject = (m: { type: "projectView"; id: string }) => void;

/** One line per point: tick, icon, date, title, project and how far away it is. */
export function MilestoneList({
  entries,
  today,
  open,
  showProject = true,
  max,
}: {
  entries: { project: Project; m: Milestone; state?: MilestoneState }[];
  today: string;
  open?: OpenProject;
  showProject?: boolean;
  /** Show this many, with "Show n more". */
  max?: number;
}) {
  const patch = useContext(PatchContext);
  const [all, setAll] = useState(false);
  const shown = max && !all ? entries.slice(0, max) : entries;
  return (
    <>
      <ul className="ms-list">
        {shown.map(({ project, m, state }) => {
          const st = state ?? milestoneState(m, today);
          const when = msWhen(m, today);
          return (
            <li key={`${project.id}-${m.id}`} className={`ms-row ${m.kind} st-${st}`}>
              {patch ? (
                <input
                  type="checkbox"
                  checked={!!m.done}
                  aria-label={`${m.title}: ${m.done ? "open again" : m.kind === "deadline" ? "mark as delivered" : "mark as reached"}`}
                  title={m.done ? "Open again" : m.kind === "deadline" ? "Mark as delivered" : "Mark as reached"}
                  onChange={() =>
                    patch(
                      (p) => void toggleMilestone(p, project.id, m.id),
                      `${m.title.length > 40 ? m.title.slice(0, 38) + "…" : m.title}: ${m.done ? "open again" : "done"}`,
                    )
                  }
                />
              ) : (
                <span className="ms-tick" aria-hidden="true">{m.done ? "☑" : "☐"}</span>
              )}
              <MsIcon kind={m.kind} />
              <span className="ms-date">{msDay(m.date)}</span>
              <span className="ms-main">
                <b>{m.title}</b>
                {showProject &&
                  (open ? (
                    <button type="button" className="text-btn ms-proj" onClick={() => open({ type: "projectView", id: project.id })}>
                      {project.name}
                    </button>
                  ) : (
                    <small className="ms-proj">{project.name}</small>
                  ))}
                {m.note && <small className="ms-note">{m.note}</small>}
                {m.movedFrom && !m.done && <small className="ms-moved">↻ {movedText(m, msDay)}</small>}
              </span>
              {when && <span className={`ms-when st-${st}`}>{when}</span>}
            </li>
          );
        })}
      </ul>
      {max != null && entries.length > max && (
        <button type="button" className="text-btn titem-more" onClick={() => setAll((x) => !x)}>
          {all ? "Show fewer" : `Show ${entries.length - max} more`}
        </button>
      )}
    </>
  );
}

/** Small line on a project card or assignment row: the next open point. */
export function NextMilestone({ project, today }: { project: Project; today: string }) {
  if (project.status === "finished" || project.status === "rejected") return null;
  const list = milestonesOf(project);
  const next = list.find((m) => !m.done);
  if (!next) return null;
  const st = milestoneState(next, today);
  const open = list.filter((m) => !m.done).length;
  const when = msWhen(next, today);
  return (
    <span className={`ms-next st-${st}`} title={`${open} open ${open === 1 ? "milestone or deadline" : "milestones and deadlines"}`}>
      <MsIcon kind={next.kind} size={13} />
      <span>
        {milestoneKindLabels[next.kind]}: <b>{next.title}</b> · {msDay(next.date)}
        {when ? ` · ${when}` : ""}
        {next.movedFrom ? ` · moved from ${msDay(next.movedFrom)}` : ""}
        {open > 1 ? ` (+${open - 1})` : ""}
      </span>
    </span>
  );
}

type MsFilter = "open" | "overdue" | "done" | "all";

/** Projects view layout: every point of the listed projects, grouped by month. */
export function MilestonesView({
  plan,
  list,
  today,
  open,
}: {
  plan: Plan;
  list: Project[];
  today: string;
  open: OpenProject & ((m: { type: "project"; id: string }) => void);
}) {
  const [filter, setFilterState] = useState<MsFilter>(() => {
    try {
      const v = localStorage.getItem("tc-ms-filter");
      return v === "overdue" || v === "done" || v === "all" ? v : "open";
    } catch {
      return "open";
    }
  });
  const setFilter = (v: MsFilter) => {
    setFilterState(v);
    try {
      localStorage.setItem("tc-ms-filter", v);
    } catch {}
  };
  const every = teamMilestones(plan, today, { projects: list, done: true, closed: true });
  const counts: Record<MsFilter, number> = {
    open: every.filter((e) => e.state !== "done").length,
    overdue: every.filter((e) => e.state === "overdue").length,
    done: every.filter((e) => e.state === "done").length,
    all: every.length,
  };
  const entries = every.filter((e) =>
    filter === "all" ? true : filter === "done" ? e.state === "done" : filter === "overdue" ? e.state === "overdue" : e.state !== "done",
  );
  // Overdue first (open filter), then by month.
  const groups: { head: string; items: MilestoneEntry[] }[] = [];
  const overdue = filter === "open" ? entries.filter((e) => e.state === "overdue") : [];
  if (overdue.length) groups.push({ head: "Overdue", items: overdue });
  for (const e of entries) {
    if (filter === "open" && e.state === "overdue") continue;
    const head = monthHead(e.m.date);
    const g = groups[groups.length - 1];
    if (g && g.head === head) g.items.push(e);
    else groups.push({ head, items: [e] });
  }
  if (filter === "done") groups.reverse();
  const withNone = list.filter((p) => !p.milestones?.length);
  return (
    <section className="card ms-view">
      <div className="ms-view-head">
        <div className="segmented" role="group" aria-label="Show">
          {(
            [
              ["open", "Open"],
              ["overdue", "Overdue"],
              ["done", "Done"],
              ["all", "All"],
            ] as [MsFilter, string][]
          ).map(([v, label]) => (
            <button key={v} className={filter === v ? "selected" : ""} aria-pressed={filter === v} onClick={() => setFilter(v)}>
              {label} <b>{counts[v]}</b>
            </button>
          ))}
        </div>
        <span className="ms-legend">
          <span><MsIcon kind="milestone" size={13} /> Milestone: something reached</span>
          <span><MsIcon kind="deadline" size={13} /> Deadline: something due</span>
        </span>
      </div>
      {groups.length ? (
        groups.map((g) => (
          <div key={g.head} className={`ms-group${g.head === "Overdue" ? " overdue" : ""}`}>
            <h3>{g.head}</h3>
            <MilestoneList entries={g.items} today={today} open={open} />
          </div>
        ))
      ) : (
        <p className="muted pad">
          {every.length
            ? "Nothing here with this choice."
            : "No milestones or deadlines yet. Open a project, choose Edit and add them under Milestones and deadlines. They are optional."}
        </p>
      )}
      {!!withNone.length && every.length > 0 && (
        <p className="tl-undated">
          No milestones yet:{" "}
          {withNone.slice(0, 30).map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && ", "}
              <button className="text-btn" onClick={() => open({ type: "project", id: p.id })}>
                {p.name}
              </button>
            </React.Fragment>
          ))}
          {withNone.length > 30 ? ` and ${withNone.length - 30} more` : ""}
        </p>
      )}
    </section>
  );
}

/** Draft rows in the project dialog. Empty rows (no title and no date) are dropped on save. */
export type MilestoneDraft = { id: string; kind: MilestoneKind; title: string; date: string; note: string; done: boolean };
export const toDrafts = (p?: Project): MilestoneDraft[] =>
  milestonesOf(p ?? ({} as Project)).map((m) => ({ id: m.id, kind: m.kind, title: m.title, date: m.date, note: m.note ?? "", done: !!m.done }));

/** Turns drafts into stored points; throws with a readable message when a row is half filled. */
export function fromDrafts(rows: MilestoneDraft[]): Milestone[] {
  const out: Milestone[] = [];
  rows.forEach((r, i) => {
    const title = r.title.trim();
    if (!title && !r.date && !r.note.trim()) return;
    const what = `${milestoneKindLabels[r.kind]} ${i + 1}`;
    if (!title) throw new Error(`${what} needs a title.`);
    if (!r.date) throw new Error(`${what} (${title}) needs a date.`);
    const m: Milestone = { id: r.id, kind: r.kind, title: title.slice(0, MILESTONE_TITLE_MAX), date: r.date };
    if (r.note.trim()) m.note = r.note.trim().slice(0, 2000);
    if (r.done) m.done = true;
    out.push(m);
  });
  return out;
}

/** Editor rows: kind, title, date, note, done; add and remove. Saved in date order. */
export function MilestoneEditor({ value, onChange }: { value: MilestoneDraft[]; onChange: (rows: MilestoneDraft[]) => void }) {
  const set = (id: string, part: Partial<MilestoneDraft>) => onChange(value.map((r) => (r.id === id ? { ...r, ...part } : r)));
  const add = (kind: MilestoneKind) =>
    onChange([...value, { id: `m-${uid().slice(0, 8)}`, kind, title: "", date: "", note: "", done: false }]);
  return (
    <div className="ms-editor">
      {value.length > 0 && (
        <div className="ms-erow ms-ehead" aria-hidden="true">
          <span>Kind</span>
          <span>Title</span>
          <span>Date</span>
          <span>Note (optional)</span>
          <span>Done</span>
          <span />
        </div>
      )}
      {value.map((r, i) => (
        <div className="ms-erow" key={r.id}>
          <select
            aria-label={`Row ${i + 1} kind`}
            value={r.kind}
            onChange={(e) => set(r.id, { kind: e.target.value as MilestoneKind })}
          >
            {milestoneKinds.map((k) => (
              <option key={k} value={k}>
                {milestoneKindLabels[k]}
              </option>
            ))}
          </select>
          <input
            aria-label={`Row ${i + 1} title`}
            placeholder={r.kind === "deadline" ? "e.g. Deliverable D2.1 report" : "e.g. Test rig ready"}
            maxLength={MILESTONE_TITLE_MAX}
            value={r.title}
            onChange={(e) => set(r.id, { title: e.target.value })}
          />
          <input type="date" aria-label={`Row ${i + 1} date`} value={r.date} onChange={(e) => set(r.id, { date: e.target.value })} />
          <input
            aria-label={`Row ${i + 1} note`}
            placeholder="e.g. To the funder portal"
            maxLength={2000}
            value={r.note}
            onChange={(e) => set(r.id, { note: e.target.value })}
          />
          <input
            type="checkbox"
            aria-label={`Row ${i + 1} done`}
            title={r.kind === "deadline" ? "Delivered" : "Reached"}
            checked={r.done}
            onChange={(e) => set(r.id, { done: e.target.checked })}
          />
          <span className="ms-eact">
            <button type="button" className="icon-btn" aria-label={`Remove row ${i + 1}`} onClick={() => onChange(value.filter((x) => x.id !== r.id))}>
              <X size={14} />
            </button>
          </span>
        </div>
      ))}
      <div className="row-actions">
        <button type="button" className="text-btn" onClick={() => add("milestone")}>
          <Plus size={14} />
          <Diamond size={13} className="ms-ico ms" />
          Add milestone
        </button>
        <button type="button" className="text-btn" onClick={() => add("deadline")}>
          <Plus size={14} />
          <Flag size={13} className="ms-ico dl" />
          Add deadline
        </button>
        <small className="muted">Optional. Lists show them in date order; tick one when it is reached or delivered.</small>
      </div>
    </div>
  );
}

/** Compact badge for a project card: overdue and due-soon counts, else the next date (v24). */
export function MilestoneBadge({ project, today }: { project: Project; today: string }) {
  if (project.status === "finished" || project.status === "rejected") return null;
  const open = milestonesOf(project).filter((m) => !m.done);
  if (!open.length) return null;
  const overdue = open.filter((m) => m.date < today).length;
  const soon = open.filter((m) => m.date >= today && dayNum(m.date) - dayNum(today) <= 30).length;
  const next = open.find((m) => m.date >= today);
  const tip = open
    .slice(0, 8)
    .map(
      (m) =>
        `${milestoneKindLabels[m.kind]}: ${m.title}, ${msDay(m.date)}${msWhen(m, today) ? ` (${msWhen(m, today).toLowerCase()})` : ""}${m.movedFrom ? `, ${movedText(m, msDay).toLowerCase()}` : ""}`,
    )
    .join("\n");
  const kind = open.some((m) => m.kind === "deadline") ? "deadline" : "milestone";
  return (
    <span className="ms-badges" title={tip}>
      {overdue > 0 && (
        <span className="ms-badge st-overdue">
          <MsIcon kind={kind} size={12} />
          {overdue} overdue
        </span>
      )}
      {soon > 0 && (
        <span className="ms-badge st-soon">
          {overdue === 0 && <MsIcon kind={kind} size={12} />}
          {soon} due in 30 days
        </span>
      )}
      {overdue === 0 && soon === 0 && next && (
        <span className="ms-badge">
          <MsIcon kind={next.kind} size={12} />
          Next {msDay(next.date)}
        </span>
      )}
    </span>
  );
}

/** A person's coming milestones and deadlines across their current projects (v24). */
export function PersonDeadlines({
  plan,
  personId,
  today,
  open,
}: {
  plan: Plan;
  personId: string;
  today: string;
  open?: OpenProject;
}) {
  const ids = new Set(plan.assignments.filter((a) => a.personId === personId && a.status !== "finished").map((a) => a.projectId));
  const projects = plan.projects.filter((p) => ids.has(p.id));
  if (!projects.some((p) => p.milestones?.length)) return null;
  const entries = teamMilestones(plan, today, { projects, days: 90 });
  return (
    <div className="person-ms">
      <div className="cap-head">
        <span>Deadlines and milestones</span>
        <span className="muted">next 3 months</span>
      </div>
      {entries.length ? (
        <MilestoneList entries={entries} today={today} open={open} max={5} />
      ) : (
        <p className="muted small">Nothing overdue or due in the next three months.</p>
      )}
    </div>
  );
}

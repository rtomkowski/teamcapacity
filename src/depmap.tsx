// Dependency map: shared work drawn as projects (columns), tasks (boxes), combined work (lines) and waits-on (arrows).
// Drag from one box to a box in another project to connect them.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Pencil, ArrowUpRight, Hourglass, Link2 } from "lucide-react";
import {
  type Plan,
  type MapEdge,
  type ProjectRef,
  dependencyGraph,
  connectRefs,
  removeWait,
  leaveWorkItem,
  keyRef,
  refKey,
  refLabel,
  taskLibrary,
  workItemsOf,
  workItemParts,
  workStatusLabels,
} from "./model";
import { accentOf } from "./views";

type Patch = (fn: (p: Plan) => void, message?: string) => void;
type OpenFn = (m: { type: "workitem"; id?: string } | { type: "projectView"; id: string }) => void;

const COLW = 200,
  GAP = 100,
  PAD = 20,
  HEAD = 48,
  NODE = 38,
  VG = 10,
  TOP = PAD + HEAD + 16;

const longCount = (g: { edges: MapEdge[] }, pos: Record<string, { col: number }>) =>
  g.edges.filter((e) => pos[e.from] && pos[e.to] && Math.abs(pos[e.from].col - pos[e.to].col) > 1).length;
const edgeId = (e: MapEdge) => `${e.kind}:${e.itemId}:${e.from}>${e.to}`;

export function DependencyMap({
  plan,
  includeDone,
  focusId,
  setFocusId,
  patch,
  open,
}: {
  plan: Plan;
  includeDone: boolean;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  patch: Patch;
  open: OpenFn;
}) {
  const [extra, setExtra] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number; over: string | null } | null>(null);
  const [pending, setPending] = useState<{ a: string; b: string; x: number; y: number } | null>(null);
  const [hint, setHint] = useState("");
  const [addP, setAddP] = useState("");
  const [addT, setAddT] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ from: string; sx: number; sy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(0);

  const lib = taskLibrary(plan);
  const items = workItemsOf(plan);
  const g = useMemo(() => dependencyGraph(plan, includeDone, extra), [plan, includeDone, extra]);

  // Positions of every node.
  const pos = useMemo(() => {
    const out: Record<string, { x: number; y: number; w: number; h: number; col: number }> = {};
    g.projects.forEach((pid, col) => {
      const x = PAD + col * (COLW + GAP);
      g.nodes[pid].forEach((k, j) => {
        if (!keyRef(k).taskId) out[k] = { x, y: PAD, w: COLW, h: HEAD, col };
        else out[k] = { x: x + 12, y: TOP + (j - 1) * (NODE + VG), w: COLW - 12, h: NODE, col };
      });
    });
    return out;
  }, [g]);
  const rows = Math.max(0, ...g.projects.map((p) => g.nodes[p].length - 1));
  const width = Math.max(PAD * 2 + g.projects.length * COLW + Math.max(0, g.projects.length - 1) * GAP, 320);
  const height = Math.max(TOP + rows * (NODE + VG) + PAD + longCount(g, pos) * 7, pending ? 300 : 0);

  const pname = (pid: string) => plan.projects.find((x) => x.id === pid)?.name ?? "Removed project";
  const tname = (tid?: string) => (tid ? lib.find((x) => x.id === tid)?.name ?? "Task" : undefined);
  const label = (k: string) => refLabel(plan, keyRef(k));
  const short = (k: string) => {
    const r = keyRef(k);
    return tname(r.taskId) ?? pname(r.projectId);
  };
  // Short names for a pair, with the project added when both sides have the same task name.
  const pairNames = (a: string, b: string) => {
    const same = short(a) === short(b);
    return same ? [label(a), label(b)] : [short(a), short(b)];
  };

  // What to highlight: hover beats a selected link or node, which beats the focused shared work.
  const selectedEdge = g.edges.find((e) => edgeId(e) === selEdge) ?? null;
  const activeItem = selectedEdge?.itemId ?? (selNode ? null : focusId);
  const lit = useMemo(() => {
    const node = hover ?? selNode;
    if (node) {
      const ids = new Set(
        workItemsOf(plan)
          .filter((w) => workItemParts(plan, w.id).some((p) => refKey(p) === node))
          .map((w) => w.id),
      );
      const es = g.edges.filter((e) => e.from === node || e.to === node || (e.kind === "with" && ids.has(e.itemId)));
      return { edges: new Set(es.map(edgeId)), nodes: new Set([node, ...es.flatMap((e) => [e.from, e.to])]) };
    }
    if (activeItem) {
      const es = g.edges.filter((e) => e.itemId === activeItem || e.onItemId === activeItem);
      const ns = workItemParts(plan, activeItem).map((p) => refKey(p));
      return { edges: new Set(es.map(edgeId)), nodes: new Set([...ns, ...es.flatMap((e) => [e.from, e.to])]) };
    }
    return null;
  }, [hover, selNode, activeItem, g, plan]);

  // Drop the selection when it disappears (after undo or a removal).
  useEffect(() => {
    if (selEdge && !selectedEdge) setSelEdge(null);
    if (focusId && !items.some((w) => w.id === focusId)) setFocusId(null);
  });
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(""), 3500);
    return () => clearTimeout(t);
  }, [hint]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (start.current || pending) {
        start.current = null;
        setDrag(null);
        setPending(null);
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pending]);

  const local = (cx: number, cy: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  };
  const nodeAt = (cx: number, cy: number) =>
    (document.elementFromPoint(cx, cy) as HTMLElement | null)?.closest<HTMLElement>("[data-node]")?.dataset.node ?? null;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 6) return;
      s.moved = true;
      const p = local(e.clientX, e.clientY);
      const over = nodeAt(e.clientX, e.clientY);
      setDrag({ from: s.from, x: p.x, y: p.y, over: over && over !== s.from ? over : null });
    };
    const up = (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || !s.moved) return;
      suppressClick.current = Date.now();
      setDrag(null);
      const to = nodeAt(e.clientX, e.clientY);
      if (!to || to === s.from) return;
      if (keyRef(to).projectId === keyRef(s.from).projectId) {
        setHint("Connect to a task in another project.");
        return;
      }
      const p = local(e.clientX, e.clientY);
      setPending({ a: s.from, b: to, x: p.x, y: p.y });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const connect = (kind: "with" | "waits", a: string, b: string) => {
    let id = "";
    const msg = kind === "with" ? `${label(a)} works together with ${label(b)}` : `${label(a)} waits on ${label(b)}`;
    patch((p) => {
      id = connectRefs(p, keyRef(a), keyRef(b), kind);
    }, msg);
    setPending(null);
    setSelNode(null);
    setSelEdge(null);
    if (id) setFocusId(id);
  };

  // Long links (more than one column apart) run in a lane under the boxes so they never cross a box.
  const lanes = useMemo(() => {
    const out: Record<string, number> = {};
    let i = 0;
    g.edges.forEach((e) => {
      const a = pos[e.from],
        b = pos[e.to];
      if (a && b && Math.abs(a.col - b.col) > 1) out[edgeId(e)] = i++;
    });
    return { of: out, n: i };
  }, [g, pos]);
  const boxesBottom = TOP + rows * (NODE + VG);
  const path = (e: MapEdge) => {
    const a = pos[e.from],
      b = pos[e.to];
    if (!a || !b) return "";
    const right = b.col > a.col;
    const x1 = right ? a.x + a.w : a.x,
      x2 = right ? b.x : b.x + b.w;
    const y1 = a.y + a.h / 2,
      y2 = b.y + b.h / 2;
    const lane = lanes.of[edgeId(e)];
    if (lane === undefined) {
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.45) * (right ? 1 : -1);
      return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    }
    const s = right ? 1 : -1;
    const off = 16 + (lane % 8) * 9;
    const vx1 = x1 + s * off,
      vx2 = x2 - s * (GAP - off);
    const ly = boxesBottom + 6 + lane * 7;
    const r = 8;
    return [
      `M${x1},${y1}`,
      `H${vx1 - s * r}`,
      `Q${vx1},${y1} ${vx1},${y1 + r}`,
      `V${ly - r}`,
      `Q${vx1},${ly} ${vx1 + s * r},${ly}`,
      `H${vx2 - s * r}`,
      `Q${vx2},${ly} ${vx2},${ly - r}`,
      `V${y2 + r}`,
      `Q${vx2},${y2} ${vx2 + s * r},${y2}`,
      `H${x2}`,
    ].join(" ");
  };
  const dragPath = () => {
    if (!drag) return "";
    const a = pos[drag.from];
    if (!a) return "";
    const right = drag.x > a.x + a.w / 2;
    const x1 = right ? a.x + a.w : a.x,
      y1 = a.y + a.h / 2;
    const dx = Math.max(30, Math.abs(drag.x - x1) * 0.4) * (right ? 1 : -1);
    return `M${x1},${y1} C${x1 + dx},${y1} ${drag.x - dx},${drag.y} ${drag.x},${drag.y}`;
  };

  const peopleOn = (k: string) => {
    const r = keyRef(k);
    const ids = plan.assignments
      .filter((a) => a.projectId === r.projectId && a.status !== "finished" && (!r.taskId || (a.tasks ?? []).some((t) => t.taskId === r.taskId)))
      .map((a) => a.personId);
    return [...new Set(ids)].map((id) => plan.people.find((x) => x.id === id)?.name).filter(Boolean) as string[];
  };
  const itemsOn = (k: string) => {
    const ids = new Set(g.edges.filter((e) => e.from === k || e.to === k).map((e) => e.itemId));
    items.forEach((w) => {
      if (workItemParts(plan, w.id).some((p) => refKey(p) === k)) ids.add(w.id);
    });
    return items.filter((w) => ids.has(w.id) && (includeDone || w.status !== "done"));
  };

  const addNode = () => {
    if (!addP) return;
    const k = refKey(addT ? { projectId: addP, taskId: addT } : { projectId: addP });
    setExtra((x) => (x.includes(k) ? x : [...x, k]));
    setSelNode(k);
    setSelEdge(null);
    setAddT("");
  };

  const clearSel = () => {
    setSelEdge(null);
    setSelNode(null);
    setFocusId(null);
  };
  const focused = activeItem ? items.find((w) => w.id === activeItem) : undefined;
  const projectsSorted = [...plan.projects].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="dm">
      <div className="dm-tools">
        <span className="dm-legend">
          <svg width="34" height="10" aria-hidden="true">
            <line x1="2" y1="5" x2="32" y2="5" className="dm-key with" />
          </svg>
          Works together
        </span>
        <span className="dm-legend">
          <svg width="34" height="10" aria-hidden="true">
            <line x1="2" y1="5" x2="26" y2="5" className="dm-key waits" />
            <path d="M25,1 L32,5 L25,9 z" className="dm-key-head" />
          </svg>
          Waits on
        </span>
        <span className="grow" />
        <div className="dm-add">
          <select aria-label="Project to add to the map" value={addP} onChange={(e) => setAddP(e.target.value)}>
            <option value="">Add a project or task…</option>
            {projectsSorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {addP && (
            <select aria-label="Task" value={addT} onChange={(e) => setAddT(e.target.value)}>
              <option value="">Whole project</option>
              {lib.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn" disabled={!addP} onClick={addNode}>
            <Plus size={15} />
            Add to map
          </button>
        </div>
      </div>
      <p className="dm-hint">
        Drag from one box to a box in another project to connect them. Hover a box to trace its links; click a line to see
        what it is.
      </p>
      <div className="dm-scroll">
        <div
          className={`dm-canvas${drag ? " dragging" : ""}`}
          ref={canvasRef}
          style={{ width, height }}
          onClick={(e) => {
            if (Date.now() - suppressClick.current < 300) return;
            if (e.target === e.currentTarget || (e.target as Element).tagName === "svg") clearSel();
          }}
        >
          <svg className="dm-edges" width={width} height={height} aria-hidden="true">
            <defs>
              <marker id="dm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="dm-head" />
              </marker>
            </defs>
            {g.edges.map((e) => {
              const id = edgeId(e);
              const w = items.find((x) => x.id === e.itemId);
              const cls = [
                "dm-edge",
                e.kind,
                w?.status === "done" ? "done" : "",
                lit ? (lit.edges.has(id) ? "lit" : "dim") : "",
                selEdge === id ? "sel" : "",
              ].join(" ");
              const d = path(e);
              return (
                <g key={id} className={cls}>
                  <path d={d} className="dm-line" markerEnd={e.kind === "waits" ? "url(#dm-arrow)" : undefined} />
                  <path
                    d={d}
                    className="dm-hit"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelEdge(id);
                      setSelNode(null);
                    }}
                  >
                    <title>{e.kind === "with" ? `${label(e.from)} works together with ${label(e.to)}` : `${label(e.from)} waits on ${label(e.to)}`}</title>
                  </path>
                </g>
              );
            })}
            {drag && <path d={dragPath()} className="dm-drag" />}
          </svg>
          {g.projects.map((pid) =>
            g.nodes[pid].map((k) => {
              const p = pos[k];
              const r = keyRef(k);
              const pr = plan.projects.find((x) => x.id === pid)!;
              const n = peopleOn(k).length;
              const cls = [
                "dm-node",
                r.taskId ? "task" : "head",
                `t-${accentOf(pr)}`,
                lit ? (lit.nodes.has(k) ? "lit" : "dim") : "",
                selNode === k ? "sel" : "",
                drag?.over === k ? "over" : "",
                drag?.from === k ? "from" : "",
              ].join(" ");
              return (
                <button
                  key={k}
                  className={cls}
                  data-node={k}
                  style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
                  title={`${label(k)}. Drag to another project to connect.`}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("[data-handle]")) return;
                    if (e.pointerType !== "mouse") e.preventDefault();
                    start.current = { from: k, sx: e.clientX, sy: e.clientY, moved: false };
                  }}
                  onMouseEnter={() => !drag && setHover(k)}
                  onMouseLeave={() => setHover((h) => (h === k ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (Date.now() - suppressClick.current < 300) return;
                    setSelNode((s) => (s === k ? null : k));
                    setSelEdge(null);
                  }}
                >
                  {r.taskId ? (
                    <>
                      <span className="dm-name">{tname(r.taskId)}</span>
                      {n > 0 && <span className="dm-count" title={`${n} on this task`}>{n}</span>}
                    </>
                  ) : (
                    <>
                      <i className="dot-acc" />
                      <span className="dm-name">{pr.name}</span>
                    </>
                  )}
                  <span className="dm-handle" data-handle aria-hidden="true" />
                </button>
              );
            }),
          )}
          {pending && (
            <div
              className="dm-pop card"
              role="dialog"
              aria-label="Connect"
              style={{ left: Math.max(8, Math.min(pending.x, width - 290)), top: Math.max(8, Math.min(pending.y + 8, height - 290)) }}
              onClick={(e) => e.stopPropagation()}
            >
              <p>
                <b>{label(pending.a)}</b>
                <br />
                and <b>{label(pending.b)}</b>
              </p>
              <button className="btn primary" onClick={() => connect("with", pending.a, pending.b)}>
                <Link2 size={15} />
                Work together
              </button>
              <button className="btn" onClick={() => connect("waits", pending.a, pending.b)}>
                <Hourglass size={15} />
                {pairNames(pending.a, pending.b)[0]} waits on {pairNames(pending.a, pending.b)[1]}
              </button>
              <button className="btn" onClick={() => connect("waits", pending.b, pending.a)}>
                <Hourglass size={15} />
                {pairNames(pending.a, pending.b)[1]} waits on {pairNames(pending.a, pending.b)[0]}
              </button>
              <button className="btn dm-cancel" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {hint && (
        <p className="dm-note" role="status">
          {hint}
        </p>
      )}
      {!g.projects.length && (
        <div className="card dm-empty">
          <p>
            Nothing connected yet. Add two tasks from different projects with "Add to map", then drag from one to the
            other.
          </p>
        </div>
      )}
      {(selectedEdge || selNode || focused) && (
        <div className="card dm-info" role="region" aria-label="Selected">
          <button className="icon-btn dm-close" aria-label="Clear selection" onClick={clearSel}>
            <X size={15} />
          </button>
          {selNode ? (
            <>
              <h3>{label(selNode)}</h3>
              <p className="muted">{peopleOn(selNode).join(", ") || "No one on this yet"}</p>
              {keyRef(selNode).taskId && (
                <ul className="dm-items">
                  {plan.assignments
                    .filter((a) => a.projectId === keyRef(selNode).projectId && a.status !== "finished")
                    .flatMap((a) => {
                      const t = (a.tasks ?? []).find((x) => x.taskId === keyRef(selNode).taskId);
                      const who = plan.people.find((x) => x.id === a.personId)?.name ?? "";
                      return (t?.items ?? []).map((i) => (
                        <li key={`${a.id}-${i.id}`} className={i.done ? "done" : ""}>
                          <span>{i.text}</span>
                          <small className="muted">{who.split(" ")[0]}</small>
                        </li>
                      ));
                    })}
                </ul>
              )}
              <div className="dm-chips">
                {itemsOn(selNode).map((w) => (
                  <button
                    key={w.id}
                    className={`ws-pill pick ws-${w.status}`}
                    onClick={() => {
                      setSelNode(null);
                      setFocusId(w.id);
                    }}
                  >
                    <i />
                    {w.name}
                  </button>
                ))}
              </div>
              <div className="dm-actions">
                <button className="btn" onClick={() => open({ type: "projectView", id: keyRef(selNode).projectId })}>
                  <ArrowUpRight size={15} />
                  Open project
                </button>
              </div>
            </>
          ) : (
            focused && (
              <>
                <h3>
                  <span className={`ws-pill ws-${focused.status}`}>
                    <i />
                    {workStatusLabels[focused.status]}
                  </span>
                  {focused.name}
                </h3>
                {selectedEdge && (
                  <p>
                    {selectedEdge.kind === "with"
                      ? `${label(selectedEdge.from)} works together with ${label(selectedEdge.to)}.`
                      : `${label(selectedEdge.from)} waits on ${label(selectedEdge.to)}.`}
                  </p>
                )}
                {focused.note && <p className="muted">{focused.note}</p>}
                <div className="dm-actions">
                  <button className="btn" onClick={() => open({ type: "workitem", id: focused.id })}>
                    <Pencil size={14} />
                    Edit shared work
                  </button>
                  {selectedEdge?.kind === "waits" && (
                    <button
                      className="btn"
                      onClick={() => {
                        const e = selectedEdge;
                        patch((p) => removeWait(p, e), "Waits-on link removed");
                        setSelEdge(null);
                      }}
                    >
                      <X size={15} />
                      Remove this link
                    </button>
                  )}
                  {selectedEdge?.kind === "with" &&
                    [selectedEdge.from, selectedEdge.to].map((k) => (
                      <button
                        key={k}
                        className="btn"
                        onClick={() => {
                          const r: ProjectRef = keyRef(k);
                          const id = selectedEdge.itemId;
                          patch((p) => leaveWorkItem(p, id, r), `${label(k)} taken out of ${focused.name}`);
                          setSelEdge(null);
                        }}
                      >
                        <X size={15} />
                        Take {short(k)} out
                      </button>
                    ))}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

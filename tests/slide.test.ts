import test from "node:test";
import assert from "node:assert/strict";
import { paginate, rowHeight, type SlideRow } from "../src/slide.ts";

const row = (items: number): SlideRow => ({
  color: "4F8CFF",
  title: "P",
  meta: "m",
  chips: [{ text: "Writing", color: "F06A8A" }],
  groups: items ? [{ name: "Writing", color: "F06A8A", done: 0, items: Array.from({ length: items }, (_, i) => ({ text: `t${i}`, done: false })) }] : [],
  right: "",
  status: "Ongoing",
  statusColor: "4F8CFF",
});

test("editable slides: rows split over slides by height, none lost", () => {
  const rows = [row(0), row(3), row(10), row(0), row(2), row(0), row(0), row(5), row(0), row(0)];
  const pages = paginate(rows, 5.4, 5.4);
  assert.equal(pages.flat().length, rows.length);
  for (const p of pages) {
    const h = p.reduce((t, r) => t + rowHeight(r), 0);
    assert.ok(h <= 5.4 || p.length === 1);
  }
  assert.ok(pages.length >= 2);
  assert.deepEqual(paginate([], 5, 5), [[]]);
});

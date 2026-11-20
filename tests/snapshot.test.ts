import test from "node:test";
import assert from "node:assert/strict";
import { rgbHex, fileSafe } from "../src/snapshot.ts";

test("picture helpers: colours for the slide and safe file names", () => {
  assert.equal(rgbHex("rgb(12, 34, 56)"), "0C2238");
  assert.equal(rgbHex("rgba(255, 255, 255, 1)"), "FFFFFF");
  assert.equal(rgbHex("#0b0d12"), "0B0D12");
  assert.equal(fileSafe('Maja: "Lindqvist"/2026'), "Maja Lindqvist2026");
  assert.equal(fileSafe("   "), "card");
});

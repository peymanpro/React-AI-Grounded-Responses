import assert from "node:assert/strict";
import test from "node:test";
import { countOffsetUnits, offsetToUtf16, rangeToUtf16, sliceByRange } from "../src/offsets.js";

test("converts Unicode code-point offsets into JavaScript UTF-16 indices", () => {
  const text = "A😀B";
  assert.equal(countOffsetUnits(text, "codePoint"), 3);
  assert.equal(offsetToUtf16(text, 2, "codePoint"), 3);
  assert.equal(offsetToUtf16(text, 3, "codePoint"), 4);
  assert.equal(offsetToUtf16(text, 4, "codePoint"), null);
});

test("slices source evidence using a declared offset unit", () => {
  const text = "A😀B";
  assert.equal(sliceByRange(text, { start: 2, end: 3, offsetUnit: "codePoint" }), "B");
  assert.deepEqual(rangeToUtf16(text, { start: 1, end: 2, offsetUnit: "codePoint" }), {
    start: 1,
    end: 3,
  });
});

test("rejects invalid ranges rather than guessing", () => {
  assert.equal(rangeToUtf16("hello", { start: -1, end: 2 }), null);
  assert.equal(rangeToUtf16("hello", { start: 1, end: 1 }), null);
  assert.equal(offsetToUtf16("hello", 1.5, "utf16"), null);
});

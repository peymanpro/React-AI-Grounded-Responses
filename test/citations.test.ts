import assert from "node:assert/strict";
import test from "node:test";
import { parseNumericCitations, StreamingCitationParser } from "../src/citations.js";

test("parses complete numeric citation markers with original offsets", () => {
  assert.deepEqual(parseNumericCitations("A [1], then [12]."), [
    { referenceIndex: 1, start: 2, end: 5 },
    { referenceIndex: 12, start: 12, end: 16 },
  ]);
});

test("buffers incomplete numeric markers and removes them only when complete", () => {
  const parser = new StreamingCitationParser();
  assert.equal(parser.push("Answer [1").text, "Answer ");
  assert.equal(parser.push("]").text, "Answer ");
  assert.equal(parser.finish().text, "Answer ");
  assert.equal(parser.snapshot().citations.length, 1);
  assert.equal(parser.snapshot().citations[0]?.referenceIndex, 1);
});

test("produces the same final result regardless of chunk boundaries", () => {
  const text = "The answer is [1] and [2] ok.";
  const single = new StreamingCitationParser();
  single.push(text);
  const expected = single.finish();

  const chunked = new StreamingCitationParser();
  for (const chunk of ["The answer", " is [", "1", "] and [2", "] ok."]) {
    chunked.push(chunk);
  }
  const actual = chunked.finish();
  assert.deepEqual(actual, expected);
});

test("preserves malformed and unfinished markers as ordinary text at finish", () => {
  const parser = new StreamingCitationParser();
  parser.push("Literal [x] and pending [23");
  const result = parser.finish();
  assert.equal(result.text, "Literal [x] and pending [23");
  assert.equal(result.citations.length, 0);
});

test("does not accept more chunks after finish", () => {
  const parser = new StreamingCitationParser();
  parser.finish();
  assert.throws(() => parser.push("later"), /finished citation stream/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createGroundedResponseLedger } from "../src/ledger.js";
import type { Claim, Source } from "../src/types.js";

const source: Source = {
  id: "source-1",
  text: "The supported limit is 10 requests per minute.",
  version: "1",
};

const claim: Claim = {
  id: "limit",
  text: "10 requests per minute",
  responseRange: { start: 20, end: 43 },
  evidence: [
    {
      sourceId: source.id,
      start: 25,
      end: 48,
      quote: "10 requests per minute.",
      sourceVersion: "1",
    },
  ],
};

test("returns a stable snapshot reference until the ledger changes", () => {
  const ledger = createGroundedResponseLedger({ text: "The limit is 10 requests per minute.", sources: [source] });
  assert.equal(ledger.snapshot(), ledger.snapshot());
  const before = ledger.snapshot();
  ledger.appendText(" More information.");
  const after = ledger.snapshot();
  assert.notEqual(before, after);
  assert.equal(after.revision, before.revision + 1);
});

test("notifies subscribers when state changes and supports unsubscribe", () => {
  const ledger = createGroundedResponseLedger();
  let calls = 0;
  const unsubscribe = ledger.subscribe(() => {
    calls += 1;
  });
  ledger.appendText("Hello");
  unsubscribe();
  ledger.appendText(" world");
  assert.equal(calls, 1);
});

test("keeps snapshots immutable and reports validation counts", () => {
  const ledger = createGroundedResponseLedger({
    text: "The supported limit is 10 requests per minute",
    sources: [source],
    claims: [claim],
  });
  const snapshot = ledger.snapshot();
  assert.equal(snapshot.stats.totalClaims, 1);
  assert.equal(snapshot.stats.validClaims, 1);
  assert.equal(snapshot.claims[0]?.validation.status, "valid");
  assert.throws(() => {
    (snapshot.sources as Source[]).push({ id: "other", text: "bad" });
  });
});

test("revalidates claims when a source is removed or replaced", () => {
  const ledger = createGroundedResponseLedger({
    text: "The supported limit is 10 requests per minute.",
    sources: [source],
    claims: [claim],
  });
  assert.equal(ledger.snapshot().claims[0]?.validation.status, "valid");
  ledger.removeSource(source.id);
  assert.equal(ledger.snapshot().claims[0]?.validation.status, "source_missing");
  ledger.upsertSource({ ...source, version: "2" });
  assert.equal(ledger.snapshot().claims[0]?.validation.status, "stale");
});

test("rejects duplicate source and claim identifiers", () => {
  assert.throws(
    () => createGroundedResponseLedger({ sources: [source, source] }),
    /Duplicate source id/,
  );
  assert.throws(
    () =>
      createGroundedResponseLedger({
        claims: [
          { id: "same", text: "a", responseRange: { start: 0, end: 1 }, evidence: [] },
          { id: "same", text: "b", responseRange: { start: 0, end: 1 }, evidence: [] },
        ],
      }),
    /Duplicate claim id/,
  );
});

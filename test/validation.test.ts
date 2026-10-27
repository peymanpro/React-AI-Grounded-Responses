import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintText } from "../src/fingerprint.js";
import { validateClaim } from "../src/validation.js";
import type { Claim, Source } from "../src/types.js";

const source: Source = {
  id: "policy",
  title: "Refund policy",
  text: "Refunds are available within 14 days of purchase.",
  version: "v2",
};

function claim(overrides: Partial<Claim> = {}): Claim {
  const responseText = "Refunds are available within 14 days.";
  const claimText = "14 days";
  return {
    id: "refund-window",
    text: claimText,
    responseRange: {
      start: responseText.indexOf(claimText),
      end: responseText.indexOf(claimText) + claimText.length,
    },
    evidence: [
      {
        sourceId: source.id,
        start: source.text.indexOf(claimText),
        end: source.text.indexOf(claimText) + claimText.length,
        quote: claimText,
        sourceVersion: source.version,
        sourceFingerprint: fingerprintText(source.text),
      },
    ],
    ...overrides,
  };
}

test("validates a claim against an exact quote and unchanged source", () => {
  const result = validateClaim(claim(), [source], {
    responseText: "Refunds are available within 14 days.",
  });
  assert.equal(result.status, "valid");
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
});

test("detects evidence that references a missing source", () => {
  const result = validateClaim(
    claim({ evidence: [{ sourceId: "missing", start: 0, end: 2, quote: "no" }] }),
    [source],
    { responseText: "Refunds are available within 14 days." },
  );
  assert.equal(result.status, "source_missing");
  assert.equal(result.issues[0]?.code, "source_missing");
});

test("detects a quote that no longer matches the source span", () => {
  const result = validateClaim(
    claim({
      evidence: [
        {
          sourceId: source.id,
          start: source.text.indexOf("14 days"),
          end: source.text.indexOf("14 days") + 7,
          quote: "30 days",
        },
      ],
    }),
    [source],
    { responseText: "Refunds are available within 14 days." },
  );
  assert.equal(result.status, "quote_mismatch");
});

test("detects source changes using the recorded version and fingerprint", () => {
  const changedSource = { ...source, text: source.text + " Terms apply.", version: "v3" };
  const result = validateClaim(claim(), [changedSource], {
    responseText: "Refunds are available within 14 days.",
  });
  assert.equal(result.status, "stale");
  assert.ok(result.issues.some((issue) => issue.code === "source_version_mismatch"));
  assert.ok(result.issues.some((issue) => issue.code === "source_fingerprint_mismatch"));
});

test("rejects out-of-bounds evidence ranges", () => {
  const result = validateClaim(
    claim({
      evidence: [{ sourceId: source.id, start: 0, end: source.text.length + 1 }],
    }),
    [source],
    { responseText: "Refunds are available within 14 days." },
  );
  assert.equal(result.status, "span_out_of_bounds");
});

test("detects response ranges that do not match the recorded claim text", () => {
  const result = validateClaim(
    claim({ responseRange: { start: 0, end: 7 } }),
    [source],
    { responseText: "Refunds are available within 14 days." },
  );
  assert.equal(result.status, "response_text_mismatch");
});

test("supports pending claims while their evidence has not arrived", () => {
  const result = validateClaim(
    claim({ lifecycle: "pending", evidence: [] }),
    [source],
    { responseText: "Refunds are available within 14 days." },
  );
  assert.equal(result.status, "pending");
  assert.equal(result.valid, false);
});

test("supports explicit quote normalization supplied by the application", () => {
  const sourceArabic: Source = { id: "ar", text: "كيف تستخدم المكتبة؟" };
  const result = validateClaim(
    {
      id: "arabic",
      text: "كيف",
      responseRange: { start: 0, end: 3 },
      evidence: [{ sourceId: "ar", start: 0, end: 3, quote: "كيف" }],
    },
    [sourceArabic],
    { responseText: "كيف هي المكتبة؟", normalizeQuote: (value) => value.normalize("NFC") },
  );
  assert.equal(result.status, "valid");
});

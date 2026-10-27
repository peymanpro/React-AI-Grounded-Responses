import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fingerprintText } from "../src/fingerprint.js";
import { createGroundedResponseLedger } from "../src/ledger.js";
import { ClaimIntegrity, EvidencePanel, GroundedResponse } from "../src/react/index.js";
import type { Source } from "../src/types.js";

test("renders evidence-linked claim segments in server markup", () => {
  const source: Source = {
    id: "policy",
    title: "Policy",
    text: "Refunds are available within 14 days.",
  };
  const response = "Customers have 14 days to request a refund.";
  const claimText = "14 days";
  const start = response.indexOf(claimText);
  const ledger = createGroundedResponseLedger({
    text: response,
    sources: [source],
    claims: [
      {
        id: "refund-window",
        text: claimText,
        responseRange: { start, end: start + claimText.length },
        evidence: [
          {
            sourceId: source.id,
            start: source.text.indexOf(claimText),
            end: source.text.indexOf(claimText) + claimText.length,
            quote: claimText,
          },
        ],
      },
    ],
  });

  const markup = renderToStaticMarkup(
    createElement(GroundedResponse, { snapshot: ledger.snapshot() }),
  );
  assert.match(markup, /data-grounded-response/);
  assert.match(markup, /data-claim-id="refund-window"/);
  assert.match(markup, /14 days/);
});

test("highlights source passages and keeps source links optional", () => {
  const source: Source = {
    id: "policy",
    title: "Refund policy",
    uri: "https://example.com/policy",
    text: "Refunds are available within 14 days.",
  };
  const quote = "14 days";
  const markup = renderToStaticMarkup(
    createElement(EvidencePanel, {
      source,
      evidence: [
        {
          sourceId: source.id,
          start: source.text.indexOf(quote),
          end: source.text.indexOf(quote) + quote.length,
          quote,
        },
      ],
    }),
  );
  assert.match(markup, /<mark/);
  assert.match(markup, /Open original source/);
});

test("renders integrity status without styling dependencies", () => {
  const markup = renderToStaticMarkup(createElement(ClaimIntegrity, { status: "stale" }));
  assert.match(markup, /data-integrity-status="stale"/);
  assert.match(markup, /stale/);
});


test("does not highlight evidence whose recorded quote no longer matches the source span", () => {
  const source: Source = {
    id: "policy",
    text: "Refunds are available within 14 days.",
  };
  const markup = renderToStaticMarkup(
    createElement(EvidencePanel, {
      source,
      evidence: [{
        sourceId: source.id,
        start: source.text.indexOf("14 days"),
        end: source.text.indexOf("14 days") + "14 days".length,
        quote: "30 days",
      }],
    }),
  );
  assert.doesNotMatch(markup, /<mark/);
});

test("does not highlight evidence tied to an older source fingerprint", () => {
  const oldText = "Refunds are available within 14 days.";
  const source: Source = {
    id: "policy",
    text: "Refunds are available within 30 days.",
    version: "v2",
  };
  const oldQuote = "14 days";
  const markup = renderToStaticMarkup(
    createElement(EvidencePanel, {
      source,
      evidence: [{
        sourceId: source.id,
        start: source.text.indexOf("30 days"),
        end: source.text.indexOf("30 days") + "30 days".length,
        quote: "30 days",
        sourceVersion: "v1",
        sourceFingerprint: fingerprintText(oldText),
      }],
    }),
  );
  assert.doesNotMatch(markup, /<mark/);
});

test("does not render source links with non-HTTP protocols", () => {
  const source: Source = {
    id: "untrusted",
    text: "Untrusted source text.",
    uri: "javascript:alert(1)",
  };
  const markup = renderToStaticMarkup(
    createElement(EvidencePanel, { source, evidence: [] }),
  );
  assert.doesNotMatch(markup, /href=/);
  assert.doesNotMatch(markup, /Open original source/);
});

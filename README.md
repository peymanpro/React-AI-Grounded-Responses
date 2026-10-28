# React AI Grounded Responses

A TypeScript library for inspectable, evidence-linked AI responses in React and Next.js.

[![CI](https://github.com/peymanpro/React-AI-Grounded-Responses/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/peymanpro/React-AI-Grounded-Responses/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/react-ai-grounded-responses)](https://www.npmjs.com/package/react-ai-grounded-responses)

**React AI Grounded Responses** is a reusable, open-source TypeScript library—not a hosted service or a complete chat application. It helps developers keep AI-response claims connected to inspectable source evidence, validate citation integrity, and build accessible React experiences without committing to a specific AI model or backend.

> **Status: Alpha.** The API is implemented as an initial foundation and may change before 1.0. Structural evidence checks do not prove semantic entailment or guarantee that an AI answer is true.

## Why this library exists

AI SDKs can transport text, tool events, and provider-supplied source metadata. Applications still need a consistent way to manage claim-to-source relationships, validate source spans, handle changing documents, and render those relationships in an interface. Reimplementing these details in every product leads to fragile offsets, broken citations, and unclear trust signals.

This project focuses on the reusable layer between AI output and the user interface.

## Features

- **Claim-level evidence:** connect a response range to one or more precise source spans.
- **Deterministic integrity checks:** detect missing sources, invalid ranges, mismatched quotes, and stale source versions or fingerprints.
- **Streaming-aware state:** append response chunks and update structured claims without coupling the core to an AI provider.
- **Incremental citation parsing:** buffer incomplete numeric citation markers and produce the same final result regardless of chunk boundaries.
- **Unicode offset conversion:** explicitly distinguish UTF-16 offsets from Unicode code-point offsets instead of guessing.
- **Provider-neutral core:** plain TypeScript with no runtime dependency on an AI SDK or browser APIs.
- **React integration:** subscribe to a ledger with useSyncExternalStore, render claims, and highlight source evidence.
- **Next.js App Router support:** pass a serializable snapshot across a Server/Client Component boundary; keep live ledger objects inside client code.
- **Accessible, unstyled primitives:** keyboard support when claim selection is enabled, ARIA labels, semantic source panels, and no required styling system.
- **No semantic-truth claims:** semantic review results are separate, optional application-provided metadata.

## Requirements

- Node.js 22 or later for development and tests.
- React 18.2 or 19 when using the optional React entry point.
- npm for the maintainer release workflow. Consumers can install the package with npm, pnpm, Yarn, or Bun.

The core entry point is independent of React. React is a peer dependency and is only needed when importing the React adapter.

## Installation

Choose the command for the package manager used by your project; you only need to run one of these:

```bash
# npm
npm install react-ai-grounded-responses

# pnpm
pnpm add react-ai-grounded-responses

# Yarn
yarn add react-ai-grounded-responses

# Bun
bun add react-ai-grounded-responses
```

## Quick start: create a grounded response ledger

```ts
import {
  createGroundedResponseLedger,
  fingerprintText,
} from "react-ai-grounded-responses";

const source = {
  id: "refund-policy",
  title: "Refund policy",
  uri: "https://example.com/refunds",
  text: "Customers may request a refund within 14 days of purchase.",
  version: "refunds-2026-10",
};

const response = "Customers can request a refund within 14 days of purchase.";
const quote = "within 14 days";
const responseStart = response.indexOf(quote);
const sourceStart = source.text.indexOf(quote);

const ledger = createGroundedResponseLedger({
  text: response,
  sources: [source],
});

ledger.upsertClaim({
  id: "refund-window",
  text: quote,
  responseRange: {
    start: responseStart,
    end: responseStart + quote.length,
  },
  evidence: [{
    sourceId: source.id,
    start: sourceStart,
    end: sourceStart + quote.length,
    quote,
    sourceVersion: source.version,
    sourceFingerprint: fingerprintText(source.text),
  }],
});

const snapshot = ledger.snapshot();
console.log(snapshot.claims[0]?.validation.status); // "valid"
```

The ledger verifies that the referenced source exists, the evidence span is within that source, the quote matches, and any supplied source version or fingerprint has not changed. These checks validate provenance and integrity—not whether the source logically proves the claim.

## Render the response in React

The React entry point is separate from the core:

```tsx
import {
  ClaimIntegrity,
  EvidencePanel,
  GroundedResponse,
} from "react-ai-grounded-responses/react";

// snapshot is a serializable result of ledger.snapshot().
<GroundedResponse
  snapshot={snapshot}
  onClaimSelect={(claim, status) => {
    console.log("Selected claim:", claim.id, status);
  }}
/>

<EvidencePanel
  source={source}
  evidence={snapshot.claims[0]?.claim.evidence ?? []}
/>

<ClaimIntegrity status={snapshot.claims[0]?.validation.status ?? "pending"} />
```

**GroundedResponse** renders response segments and marks which claim records cover each segment. When **onClaimSelect** is supplied, the linked segment supports pointer and keyboard activation. **EvidencePanel** renders the original source text with valid evidence spans highlighted. All components are unstyled and can be customized with class names or the **renderClaim** callback.

## React and Next.js

The core is plain TypeScript and does not read browser globals. The React adapter is exposed through the optional **react-ai-grounded-responses/react** entry point.

- **Server Components:** create or validate data on the server and pass the serializable snapshot to the React component.
- **Client Components:** use **useGroundedResponse(ledger)** or pass a ledger to **GroundedResponse** only inside client-side code. Class instances should not cross a Next.js Server/Client Component boundary.
- **Hydration:** the ledger caches immutable snapshots for useSyncExternalStore and supplies the same snapshot getter for server rendering.
- **Streaming:** feed chunks into **ledger.appendText(chunk)**. Attach or update claim records when reliable structured evidence metadata becomes available.
- **Production validation:** run the test suite and verify SSR, hydration, and a production Next.js App Router build in the application that consumes the package.

The library does not open network connections, call an LLM, execute retrieval, or depend on a specific AI streaming SDK.

## Citation parser

If the model emits numeric markers such as [1] or [2], the core provides **parseNumericCitations(text)** for a complete response and **StreamingCitationParser** for incremental input. The streaming parser holds a partial marker such as [12 until it is completed or the stream is finalized, and preserves malformed tokens as ordinary text.

Numeric markers are not authoritative source IDs. Applications must resolve the reference index against their own provider metadata and must handle missing or ambiguous references explicitly.

## Evidence integrity is not semantic truth

The core can validate source existence, range boundaries, quote matching, response-range matching, and source-version changes. It does **not** establish that a cited passage entails a claim or that the claim is factually correct. Semantic review is intentionally an independent, optional field supplied by the application or a verifier it controls.

A status of **valid** means the recorded structural links passed the configured checks. It must not be presented to end users as a guarantee of truth.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:package
```

See [Architecture](docs/architecture.md), [API guide](docs/api.md), [Release process](docs/releasing.md), [Contributing](CONTRIBUTING.md), and [Security Policy](SECURITY.md).

## Automated releases

The release workflow follows Conventional Commits and semantic versioning. After the one-time npm Trusted Publishing setup, qualifying changes merged into main are tested before semantic-release updates the version and changelog, creates a GitHub Release, and publishes through npm OIDC—without a long-lived npm write token stored in GitHub.

| Commit type | Intended release |
| --- | --- |
| feat: | Minor |
| fix: or perf: | Patch |
| feat!: or BREAKING CHANGE footer | Major |
| docs:, test:, ci:, chore:, refactor: | No release by default |

The initial release (`0.1.0`) is published. npm Trusted Publishing is configured and validated for this repository. Future qualifying commits merged into `main` are handled by the automated release workflow; do not select the `initial_release` option again. See [Release process](docs/releasing.md).

## Security

Do not include secrets or confidential source documents in issues, test fixtures, or logs. See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

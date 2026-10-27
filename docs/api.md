# API Guide

## Core imports

Import the provider-neutral functions and types from the package root. This entry point does not require React.

- createGroundedResponseLedger(options) — create an observable response ledger.
- validateClaim(claim, sources, options?) — validate response and evidence ranges.
- parseNumericCitations(text) — parse complete bracketed numeric references.
- StreamingCitationParser — parse numeric references across incoming chunks.
- fingerprintText(text) — create a deterministic non-cryptographic source fingerprint.
- offsetToUtf16, rangeToUtf16, sliceByRange, countOffsetUnits — offset conversion utilities.

## Create a ledger

A ledger accepts an optional response text, source array, and claim array.

- appendText(chunk) adds a streaming text chunk.
- setText(text) replaces the response.
- setSources(sources) replaces the source collection.
- upsertSource(source) and removeSource(id) update sources.
- upsertClaim(claim) and removeClaim(id) update claims.
- snapshot() returns a cached, immutable snapshot.
- subscribe(listener) registers a change listener and returns an unsubscribe function.
- getSnapshot and getServerSnapshot are stable functions intended for useSyncExternalStore.

Source and claim IDs must be non-empty and unique within their respective collections. A new snapshot object is created after a state change and reused between reads when the ledger has not changed.

## Claim and evidence ranges

A Claim includes a text value, a responseRange, and zero or more evidence spans. The response range is measured in the assistant's rendered response. Each EvidenceSpan has its own sourceId and range measured in the exact source text associated with that source.

Ranges are zero-based and end-exclusive. The offset unit defaults to UTF-16 code units. Set offsetUnit to codePoint when the producer reports Unicode code-point offsets.

The evidence quote, source version, and source fingerprint are optional but recommended when the upstream system provides them. A source fingerprint detects any source-text change; a version mismatch indicates that the evidence was captured against a different version.

## Structural statuses

- valid — structural ranges and supplied provenance checks passed.
- pending — the claim is explicitly pending and currently has no evidence.
- no_evidence — a final claim has no evidence spans.
- source_missing — an evidence span refers to an unknown source.
- invalid_range — an offset is malformed or negative.
- response_range_invalid — the claim range is invalid or extends beyond the response.
- span_out_of_bounds — an evidence range is invalid or outside its source.
- stale — recorded source version or fingerprint differs from the current source.
- quote_mismatch — the exact span does not match the recorded quote.
- response_text_mismatch — the claim text does not match the response range.

If several issues exist, the validation result returns all issues and selects one primary status using a deterministic priority. Consumers should inspect issues when they need the full diagnosis.

## Semantic review

SemanticReview is an optional application-supplied field. The core never changes it and never infers supported or contradicted from exact quote matching. The application must identify the verifier and record the review timestamp when that information is available.

## React entry point

Import React-specific exports from react-ai-grounded-responses/react:

- useGroundedResponse(ledger) — subscribe to a ledger snapshot.
- GroundedResponse — render response text and mark segments covered by claims.
- EvidencePanel — render source text with supplied evidence spans highlighted.
- ClaimIntegrity — render a structural integrity status.
- GroundedSegment — renderer data passed to renderClaim.

GroundedResponse accepts either a serializable snapshot or a live ledger. Use the snapshot form when crossing a Next.js Server/Client Component boundary. The live ledger form and callbacks must remain in client-side React code.

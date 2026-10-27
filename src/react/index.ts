'use client';

import {
  createElement,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { rangeToUtf16 } from "../offsets.js";
import type {
  Claim,
  ClaimIntegrityStatus,
  ClaimRecord,
  EvidenceSpan,
  GroundedResponseSnapshot,
  Source,
} from "../types.js";
import type { GroundedResponseLedger } from "../ledger.js";

export function useGroundedResponse(
  ledger: GroundedResponseLedger,
): GroundedResponseSnapshot {
  return useSyncExternalStore(
    ledger.subscribe,
    ledger.getSnapshot,
    ledger.getServerSnapshot,
  );
}

export interface GroundedSegment {
  readonly text: string;
  readonly claims: readonly ClaimRecord[];
}

interface PositionedClaim {
  readonly record: ClaimRecord;
  readonly start: number;
  readonly end: number;
}

export type GroundedResponseProps =
  | {
      readonly snapshot: GroundedResponseSnapshot;
      readonly ledger?: never;
      readonly className?: string;
      readonly onClaimSelect?: (claim: Claim, status: ClaimIntegrityStatus) => void;
      readonly renderClaim?: (segment: GroundedSegment) => ReactNode;
    }
  | {
      readonly ledger: GroundedResponseLedger;
      readonly snapshot?: never;
      readonly className?: string;
      readonly onClaimSelect?: (claim: Claim, status: ClaimIntegrityStatus) => void;
      readonly renderClaim?: (segment: GroundedSegment) => ReactNode;
    };

function createSegments(text: string, claims: readonly ClaimRecord[]): GroundedSegment[] {
  const positioned: PositionedClaim[] = [];
  const boundaries = new Set<number>([0, text.length]);

  for (const record of claims) {
    const range = rangeToUtf16(text, record.claim.responseRange);
    if (!range) {
      continue;
    }
    positioned.push({ record, start: range.start, end: range.end });
    boundaries.add(range.start);
    boundaries.add(range.end);
  }

  const sorted = Array.from(boundaries).sort((left, right) => left - right);
  const segments: Array<{ text: string; claims: readonly ClaimRecord[]; identity: string }> = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]!;
    const end = sorted[index + 1]!;
    if (end <= start) {
      continue;
    }
    const active = positioned
      .filter((claim) => claim.start < end && claim.end > start)
      .map((claim) => claim.record);
    const identity = active.map((record) => record.claim.id).join("\u0000");
    const piece = text.slice(start, end);
    const previous = segments[segments.length - 1];

    if (previous && previous.identity === identity) {
      segments[segments.length - 1] = {
        ...previous,
        text: previous.text + piece,
      };
    } else {
      segments.push({ text: piece, claims: active, identity });
    }
  }

  return segments.map(({ text: segmentText, claims: active }) => ({
    text: segmentText,
    claims: active,
  }));
}

function defaultClaimElement(
  segment: GroundedSegment,
  index: number,
  onClaimSelect?: (claim: Claim, status: ClaimIntegrityStatus) => void,
): ReactNode {
  if (segment.claims.length === 0) {
    return segment.text;
  }

  const primary = segment.claims[0]!;
  const claimIds = segment.claims.map((record) => record.claim.id).join(" ");
  const props: Record<string, unknown> = {
    key: "claim-" + index,
    className: "rai-grounded-response__claim",
    "data-claim-id": primary.claim.id,
    "data-claim-ids": claimIds,
    "data-integrity-status": primary.validation.status,
    title: "Evidence integrity: " + primary.validation.status,
  };

  if (onClaimSelect) {
    props.role = "button";
    props.tabIndex = 0;
    props["aria-label"] =
      "Inspect claim: " + primary.claim.text + ". Evidence integrity: " + primary.validation.status;
    props.onClick = () => onClaimSelect(primary.claim, primary.validation.status);
    props.onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClaimSelect(primary.claim, primary.validation.status);
      }
    };
  }

  return createElement("span", props, segment.text);
}

/**
 * Renders a response as plain text segments linked to their claim records.
 * Pass a serializable snapshot when rendering from a Next.js Server Component.
 */
export function GroundedResponse(props: GroundedResponseProps): ReactNode {
  const snapshot = props.ledger
    ? useGroundedResponse(props.ledger)
    : props.snapshot;
  if (!snapshot) {
    return null;
  }

  const segments = createSegments(snapshot.text, snapshot.claims);
  const children = segments.map((segment, index) => {
    if (segment.claims.length > 0 && props.renderClaim) {
      return createElement(
        "span",
        { key: "segment-" + index, className: "rai-grounded-response__segment" },
        props.renderClaim(segment),
      );
    }
    return defaultClaimElement(segment, index, props.onClaimSelect);
  });

  return createElement(
    "div",
    {
      className: props.className ?? "rai-grounded-response",
      "data-grounded-response": true,
    },
    ...children,
  );
}

export interface EvidencePanelProps {
  readonly source: Source;
  readonly evidence: readonly EvidenceSpan[];
  readonly className?: string;
  readonly title?: string;
}

interface PositionedEvidence {
  readonly span: EvidenceSpan;
  readonly start: number;
  readonly end: number;
}

/** Renders the source text with each valid evidence span highlighted. */
export function EvidencePanel(props: EvidencePanelProps): ReactNode {
  const positioned: PositionedEvidence[] = [];
  const boundaries = new Set<number>([0, props.source.text.length]);

  for (const span of props.evidence) {
    if (span.sourceId !== props.source.id) {
      continue;
    }
    const range = rangeToUtf16(props.source.text, span);
    if (!range) {
      continue;
    }
    positioned.push({ span, start: range.start, end: range.end });
    boundaries.add(range.start);
    boundaries.add(range.end);
  }

  const sorted = Array.from(boundaries).sort((left, right) => left - right);
  const chunks: ReactNode[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]!;
    const end = sorted[index + 1]!;
    if (end <= start) {
      continue;
    }
    const text = props.source.text.slice(start, end);
    const match = positioned.find((span) => span.start < end && span.end > start);
    chunks.push(
      match
        ? createElement(
            "mark",
            {
              key: "evidence-" + index,
              "data-evidence-source-id": props.source.id,
              "data-source-offset-start": start,
              "data-source-offset-end": end,
            },
            text,
          )
        : text,
    );
  }

  const title = props.title ?? props.source.title ?? "Source: " + props.source.id;
  return createElement(
    "aside",
    {
      className: props.className ?? "rai-evidence-panel",
      "aria-label": title,
      "data-evidence-panel": props.source.id,
    },
    createElement("h2", null, title),
    createElement("pre", null, createElement("code", null, ...chunks)),
    props.source.uri
      ? createElement(
          "a",
          { href: props.source.uri, rel: "noreferrer", target: "_blank" },
          "Open original source",
        )
      : null,
  );
}

export interface ClaimIntegrityProps {
  readonly status: ClaimIntegrityStatus;
  readonly className?: string;
}

/** Displays an explicit structural status without implying semantic truth. */
export function ClaimIntegrity(props: ClaimIntegrityProps): ReactNode {
  return createElement(
    "span",
    {
      className: props.className ?? "rai-claim-integrity",
      "data-integrity-status": props.status,
      "aria-label": "Evidence integrity: " + props.status,
    },
    props.status.replaceAll("_", " "),
  );
}

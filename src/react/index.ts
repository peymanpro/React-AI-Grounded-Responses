'use client';

import {
  createElement,
  useSyncExternalStore,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { fingerprintText } from "../fingerprint.js";
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

interface SharedGroundedResponseProps {
  readonly className?: string;
  readonly onClaimSelect?: (claim: Claim, status: ClaimIntegrityStatus) => void;
  readonly renderClaim?: (segment: GroundedSegment) => ReactNode;
}

export type GroundedResponseProps =
  | (SharedGroundedResponseProps & {
      readonly snapshot: GroundedResponseSnapshot;
      readonly ledger?: never;
    })
  | (SharedGroundedResponseProps & {
      readonly ledger: GroundedResponseLedger;
      readonly snapshot?: never;
    });

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
  const props: HTMLAttributes<HTMLSpanElement> & {
    "data-claim-id": string;
    "data-claim-ids": string;
    "data-integrity-status": ClaimIntegrityStatus;
  } = {
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

  return createElement("span", { key: "claim-" + index, ...props }, segment.text);
}

function renderGroundedSnapshot(
  snapshot: GroundedResponseSnapshot,
  props: SharedGroundedResponseProps,
): ReactNode {
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

function LiveGroundedResponse(
  props: SharedGroundedResponseProps & { readonly ledger: GroundedResponseLedger },
): ReactNode {
  const snapshot = useGroundedResponse(props.ledger);
  return renderGroundedSnapshot(snapshot, props);
}

/**
 * Renders a response linked to its claim records.
 * Pass a serializable snapshot from a Next.js Server Component. Pass a ledger
 * only to a React component that is already running on the client.
 */
export function GroundedResponse(props: GroundedResponseProps): ReactNode {
  if (props.ledger) {
    return createElement(LiveGroundedResponse, {
      ledger: props.ledger,
      className: props.className,
      onClaimSelect: props.onClaimSelect,
      renderClaim: props.renderClaim,
    });
  }
  return renderGroundedSnapshot(props.snapshot, props);
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

function safeSourceHref(uri?: string): string | undefined {
  if (!uri) {
    return undefined;
  }

  try {
    const url = new URL(uri);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** Renders the source text with structurally valid, current evidence highlighted. */
export function EvidencePanel(props: EvidencePanelProps): ReactNode {
  const positioned: PositionedEvidence[] = [];
  const boundaries = new Set<number>([0, props.source.text.length]);
  const currentFingerprint = fingerprintText(props.source.text);

  for (const span of props.evidence) {
    if (span.sourceId !== props.source.id) {
      continue;
    }
    if (
      span.sourceVersion !== undefined &&
      span.sourceVersion !== props.source.version
    ) {
      continue;
    }
    if (
      span.sourceFingerprint !== undefined &&
      span.sourceFingerprint !== currentFingerprint
    ) {
      continue;
    }

    const range = rangeToUtf16(props.source.text, span);
    if (!range) {
      continue;
    }

    const sourceQuote = props.source.text.slice(range.start, range.end);
    if (span.quote !== undefined && sourceQuote !== span.quote) {
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
  const sourceHref = safeSourceHref(props.source.uri);
  return createElement(
    "aside",
    {
      className: props.className ?? "rai-evidence-panel",
      "aria-label": title,
      "data-evidence-panel": props.source.id,
    },
    createElement("h2", null, title),
    createElement("pre", null, createElement("code", null, ...chunks)),
    sourceHref
      ? createElement(
          "a",
          { href: sourceHref, rel: "noreferrer", target: "_blank" },
          "Open original source",
        )
      : null,
  );
}

export interface ClaimIntegrityProps {
  readonly status: ClaimIntegrityStatus;
  readonly className?: string;
}

/** Displays an explicit structural status without styling dependencies. */
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

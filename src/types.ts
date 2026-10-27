export type OffsetUnit = "utf16" | "codePoint";

export interface TextRange {
  /** Zero-based start offset, inclusive. */
  readonly start: number;
  /** End offset, exclusive. */
  readonly end: number;
  /** Defaults to JavaScript UTF-16 code units. */
  readonly offsetUnit?: OffsetUnit;
}

export interface Source {
  readonly id: string;
  readonly title?: string;
  readonly uri?: string;
  readonly text: string;
  /** Provider or application version for this source snapshot. */
  readonly version?: string;
}

export interface EvidenceSpan extends TextRange {
  readonly sourceId: string;
  /** Exact source quote, when available. */
  readonly quote?: string;
  /** Version captured when the evidence span was created. */
  readonly sourceVersion?: string;
  /** Optional fingerprint of the entire source text at capture time. */
  readonly sourceFingerprint?: string;
}

export type SemanticReviewStatus =
  | "not_checked"
  | "supported"
  | "partially_supported"
  | "contradicted"
  | "inconclusive";

export interface SemanticReview {
  readonly status: SemanticReviewStatus;
  readonly verifier?: string;
  readonly reviewedAt?: string;
  readonly details?: string;
}

export interface Claim {
  readonly id: string;
  readonly text: string;
  /** Range of this claim in the assistant response, not in its source. */
  readonly responseRange: TextRange;
  readonly evidence: readonly EvidenceSpan[];
  /** Pending claims may temporarily have no evidence while a stream is arriving. */
  readonly lifecycle?: "pending" | "final";
  /** Optional application-supplied semantic result; never inferred by the core. */
  readonly semanticReview?: SemanticReview;
}

export type ClaimIntegrityStatus =
  | "pending"
  | "valid"
  | "no_evidence"
  | "source_missing"
  | "invalid_range"
  | "span_out_of_bounds"
  | "stale"
  | "quote_mismatch"
  | "response_range_invalid"
  | "response_text_mismatch";

export type ValidationIssueCode =
  | "no_evidence"
  | "source_missing"
  | "invalid_range"
  | "span_out_of_bounds"
  | "source_version_mismatch"
  | "source_fingerprint_mismatch"
  | "quote_mismatch"
  | "response_range_invalid"
  | "response_text_mismatch";

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly message: string;
  readonly sourceId?: string;
}

export interface ClaimValidation {
  readonly status: ClaimIntegrityStatus;
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface ClaimRecord {
  readonly claim: Claim;
  readonly validation: ClaimValidation;
}

export interface GroundedResponseStats {
  readonly totalClaims: number;
  readonly validClaims: number;
  readonly pendingClaims: number;
  readonly invalidClaims: number;
  readonly claimsByStatus: Readonly<Record<ClaimIntegrityStatus, number>>;
}

export interface GroundedResponseSnapshot {
  readonly text: string;
  readonly sources: readonly Source[];
  readonly claims: readonly ClaimRecord[];
  readonly stats: GroundedResponseStats;
  readonly revision: number;
}

export interface NumericCitationMarker {
  /** One-based numeric reference, as written by the model. */
  readonly referenceIndex: number;
  /** Start offset of the marker in the original complete response. */
  readonly start: number;
  /** End offset of the marker in the original complete response, exclusive. */
  readonly end: number;
}

export interface ParsedCitationMarker extends NumericCitationMarker {
  /** Offset in the rendered text after citation markers have been removed. */
  readonly renderedOffset: number;
}

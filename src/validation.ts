import { fingerprintText } from "./fingerprint.js";
import { countOffsetUnits, offsetToUtf16 } from "./offsets.js";
import type {
  Claim,
  ClaimIntegrityStatus,
  ClaimValidation,
  Source,
  ValidationIssue,
} from "./types.js";

export interface ValidateClaimOptions {
  readonly responseText?: string;
  readonly normalizeQuote?: (value: string) => string;
}

function makeIssue(
  code: ValidationIssue["code"],
  message: string,
  sourceId?: string,
): ValidationIssue {
  return sourceId ? { code, message, sourceId } : { code, message };
}

function statusFromIssues(issues: readonly ValidationIssue[]): ClaimIntegrityStatus {
  const priorities: readonly [ValidationIssue["code"], ClaimIntegrityStatus][] = [
    ["source_missing", "source_missing"],
    ["invalid_range", "invalid_range"],
    ["response_range_invalid", "response_range_invalid"],
    ["span_out_of_bounds", "span_out_of_bounds"],
    ["source_version_mismatch", "stale"],
    ["source_fingerprint_mismatch", "stale"],
    ["quote_mismatch", "quote_mismatch"],
    ["response_text_mismatch", "response_text_mismatch"],
  ];

  for (const [code, status] of priorities) {
    if (issues.some((issue) => issue.code === code)) {
      return status;
    }
  }
  return "valid";
}

/**
 * Validates structural links only. It does not decide whether source text
 * semantically entails a claim.
 */
export function validateClaim(
  claim: Claim,
  sources: readonly Source[],
  options: ValidateClaimOptions = {},
): ClaimValidation {
  const issues: ValidationIssue[] = [];
  const normalize = options.normalizeQuote ?? ((value: string) => value);
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  if (claim.evidence.length === 0) {
    if (claim.lifecycle === "pending") {
      return { status: "pending", valid: false, issues: [] };
    }
    issues.push(makeIssue("no_evidence", "This claim has no evidence spans."));
    return { status: "no_evidence", valid: false, issues };
  }

  const responseUnit = claim.responseRange.offsetUnit ?? "utf16";
  if (
    !Number.isInteger(claim.responseRange.start) ||
    !Number.isInteger(claim.responseRange.end) ||
    claim.responseRange.start < 0 ||
    claim.responseRange.end <= claim.responseRange.start ||
    (options.responseText !== undefined &&
      claim.responseRange.end > countOffsetUnits(options.responseText, responseUnit))
  ) {
    issues.push(
      makeIssue(
        "response_range_invalid",
        "The claim range is invalid or outside the current response text.",
      ),
    );
  } else if (options.responseText !== undefined) {
    const start = offsetToUtf16(
      options.responseText,
      claim.responseRange.start,
      responseUnit,
    );
    const end = offsetToUtf16(options.responseText, claim.responseRange.end, responseUnit);
    if (start === null || end === null) {
      issues.push(
        makeIssue("response_range_invalid", "The claim range cannot be converted safely."),
      );
    } else {
      const responseQuote = options.responseText.slice(start, end);
      if (normalize(responseQuote) !== normalize(claim.text)) {
        issues.push(
          makeIssue(
            "response_text_mismatch",
            "The claim text does not match the recorded response range.",
          ),
        );
      }
    }
  }

  for (const span of claim.evidence) {
    const source = sourceById.get(span.sourceId);
    if (!source) {
      issues.push(
        makeIssue(
          "source_missing",
          "The evidence refers to a source that is not present.",
          span.sourceId,
        ),
      );
      continue;
    }

    const unit = span.offsetUnit ?? "utf16";
    if (
      !Number.isInteger(span.start) ||
      !Number.isInteger(span.end) ||
      span.start < 0 ||
      span.end <= span.start
    ) {
      issues.push(
        makeIssue(
          "invalid_range",
          "The evidence range must use non-negative integer offsets with end greater than start.",
          span.sourceId,
        ),
      );
      continue;
    }

    if (span.end > countOffsetUnits(source.text, unit)) {
      issues.push(
        makeIssue(
          "span_out_of_bounds",
          "The evidence span extends beyond the source text.",
          span.sourceId,
        ),
      );
      continue;
    }

    const start = offsetToUtf16(source.text, span.start, unit);
    const end = offsetToUtf16(source.text, span.end, unit);
    if (start === null || end === null) {
      issues.push(
        makeIssue("span_out_of_bounds", "The evidence span cannot be converted safely.", span.sourceId),
      );
      continue;
    }

    if (span.sourceVersion !== undefined && span.sourceVersion !== source.version) {
      issues.push(
        makeIssue(
          "source_version_mismatch",
          "The evidence was recorded against a different source version.",
          span.sourceId,
        ),
      );
    }

    if (
      span.sourceFingerprint !== undefined &&
      span.sourceFingerprint !== fingerprintText(source.text)
    ) {
      issues.push(
        makeIssue(
          "source_fingerprint_mismatch",
          "The source text fingerprint changed since this evidence was recorded.",
          span.sourceId,
        ),
      );
    }

    if (
      span.quote !== undefined &&
      normalize(source.text.slice(start, end)) !== normalize(span.quote)
    ) {
      issues.push(
        makeIssue(
          "quote_mismatch",
          "The source text in this range does not match the recorded quote.",
          span.sourceId,
        ),
      );
    }
  }

  if (issues.length === 0) {
    return { status: "valid", valid: true, issues: [] };
  }

  const status = statusFromIssues(issues);
  return { status, valid: false, issues };
}

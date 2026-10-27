import { validateClaim } from "./validation.js";
import type {
  Claim,
  ClaimIntegrityStatus,
  ClaimRecord,
  GroundedResponseSnapshot,
  GroundedResponseStats,
  Source,
} from "./types.js";

const statuses: readonly ClaimIntegrityStatus[] = [
  "pending",
  "valid",
  "no_evidence",
  "source_missing",
  "invalid_range",
  "span_out_of_bounds",
  "stale",
  "quote_mismatch",
  "response_range_invalid",
  "response_text_mismatch",
];

function cloneSource(source: Source): Source {
  return Object.freeze({ ...source });
}

function cloneClaim(claim: Claim): Claim {
  return Object.freeze({
    ...claim,
    responseRange: Object.freeze({ ...claim.responseRange }),
    evidence: Object.freeze(
      claim.evidence.map((span) => Object.freeze({ ...span })),
    ),
    ...(claim.semanticReview
      ? { semanticReview: Object.freeze({ ...claim.semanticReview }) }
      : {}),
  });
}

export interface CreateGroundedResponseLedgerOptions {
  readonly text?: string;
  readonly sources?: readonly Source[];
  readonly claims?: readonly Claim[];
}

export type LedgerListener = () => void;

/**
 * Holds a response and its evidence relationships.
 *
 * Snapshots are cached and immutable so they can be consumed by
 * React.useSyncExternalStore without producing a new object on every read.
 */
export class GroundedResponseLedger {
  private textValue: string;
  private sourceById = new Map<string, Source>();
  private claimById = new Map<string, Claim>();
  private listeners = new Set<LedgerListener>();
  private revision = 0;
  private cachedSnapshot: GroundedResponseSnapshot | undefined;

  constructor(options: CreateGroundedResponseLedgerOptions = {}) {
    this.textValue = options.text ?? "";
    this.setInitialSources(options.sources ?? []);
    for (const claim of options.claims ?? []) {
      if (this.claimById.has(claim.id)) {
        throw new Error("Duplicate claim id: " + claim.id);
      }
      this.claimById.set(claim.id, cloneClaim(claim));
    }
    this.cachedSnapshot = undefined;
  }

  readonly subscribe = (listener: LedgerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): GroundedResponseSnapshot => this.snapshot();

  readonly getServerSnapshot = (): GroundedResponseSnapshot => this.snapshot();

  appendText(chunk: string): void {
    if (typeof chunk !== "string") {
      throw new TypeError("Response chunks must be strings.");
    }
    if (chunk.length === 0) {
      return;
    }
    this.textValue += chunk;
    this.changed();
  }

  setText(text: string): void {
    if (typeof text !== "string") {
      throw new TypeError("Response text must be a string.");
    }
    if (this.textValue === text) {
      return;
    }
    this.textValue = text;
    this.changed();
  }

  setSources(sources: readonly Source[]): void {
    this.sourceById = this.indexSources(sources);
    this.changed();
  }

  upsertSource(source: Source): void {
    this.assertSource(source);
    this.sourceById.set(source.id, cloneSource(source));
    this.changed();
  }

  removeSource(sourceId: string): void {
    if (this.sourceById.delete(sourceId)) {
      this.changed();
    }
  }

  upsertClaim(claim: Claim): void {
    if (!claim.id.trim()) {
      throw new TypeError("Claim id must not be empty.");
    }
    this.claimById.set(claim.id, cloneClaim(claim));
    this.changed();
  }

  removeClaim(claimId: string): void {
    if (this.claimById.delete(claimId)) {
      this.changed();
    }
  }

  snapshot(): GroundedResponseSnapshot {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    const sources = Object.freeze(Array.from(this.sourceById.values()));
    const sourceList = sources as readonly Source[];
    const claims: readonly ClaimRecord[] = Object.freeze(
      Array.from(this.claimById.values()).map((claim) =>
        Object.freeze({
          claim,
          validation: validateClaim(claim, sourceList, { responseText: this.textValue }),
        }),
      ),
    );

    const claimsByStatus = Object.fromEntries(
      statuses.map((status) => [status, 0]),
    ) as Record<ClaimIntegrityStatus, number>;

    for (const record of claims) {
      claimsByStatus[record.validation.status] += 1;
    }

    const stats: GroundedResponseStats = Object.freeze({
      totalClaims: claims.length,
      validClaims: claimsByStatus.valid,
      pendingClaims: claimsByStatus.pending,
      invalidClaims: claims.length - claimsByStatus.valid - claimsByStatus.pending,
      claimsByStatus: Object.freeze(claimsByStatus),
    });

    this.cachedSnapshot = Object.freeze({
      text: this.textValue,
      sources,
      claims,
      stats,
      revision: this.revision,
    });
    return this.cachedSnapshot;
  }

  private setInitialSources(sources: readonly Source[]): void {
    this.sourceById = this.indexSources(sources);
  }

  private indexSources(sources: readonly Source[]): Map<string, Source> {
    const indexed = new Map<string, Source>();
    for (const source of sources) {
      this.assertSource(source);
      if (indexed.has(source.id)) {
        throw new Error("Duplicate source id: " + source.id);
      }
      indexed.set(source.id, cloneSource(source));
    }
    return indexed;
  }

  private assertSource(source: Source): void {
    if (!source.id.trim()) {
      throw new TypeError("Source id must not be empty.");
    }
    if (typeof source.text !== "string") {
      throw new TypeError("Source text must be a string.");
    }
  }

  private changed(): void {
    this.revision += 1;
    this.cachedSnapshot = undefined;
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }
}

export function createGroundedResponseLedger(
  options: CreateGroundedResponseLedgerOptions = {},
): GroundedResponseLedger {
  return new GroundedResponseLedger(options);
}

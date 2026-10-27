import type { NumericCitationMarker, ParsedCitationMarker } from "./types.js";

export function parseNumericCitations(text: string): readonly NumericCitationMarker[] {
  const markers: NumericCitationMarker[] = [];
  const pattern = /\[([1-9]\d*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const referenceIndex = Number(match[1]);
    if (!Number.isSafeInteger(referenceIndex) || referenceIndex <= 0) {
      continue;
    }
    markers.push({
      referenceIndex,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return Object.freeze(markers);
}

export interface StreamingCitationSnapshot {
  readonly text: string;
  readonly citations: readonly ParsedCitationMarker[];
  readonly finished: boolean;
}

/**
 * Incrementally removes complete numeric markers such as [1] from display text.
 * Incomplete tokens such as "[12" remain buffered until more data arrives.
 * The parser does not resolve reference numbers to source IDs.
 */
export class StreamingCitationParser {
  private pending = "";
  private renderedText = "";
  private rawOffset = 0;
  private citations: ParsedCitationMarker[] = [];
  private finished = false;

  push(chunk: string): StreamingCitationSnapshot {
    if (this.finished) {
      throw new Error("Cannot append to a finished citation stream.");
    }
    if (typeof chunk !== "string") {
      throw new TypeError("Stream chunks must be strings.");
    }
    this.pending += chunk;
    this.processPending(false);
    return this.snapshot();
  }

  finish(): StreamingCitationSnapshot {
    if (!this.finished) {
      this.processPending(true);
      this.finished = true;
    }
    return this.snapshot();
  }

  snapshot(): StreamingCitationSnapshot {
    return Object.freeze({
      text: this.renderedText,
      citations: Object.freeze(this.citations.slice()),
      finished: this.finished,
    });
  }

  private processPending(flush: boolean): void {
    while (this.pending.length > 0) {
      if (this.pending[0] !== "[") {
        const nextBracket = this.pending.indexOf("[");
        const count = nextBracket === -1 ? this.pending.length : nextBracket;
        this.emitText(this.pending.slice(0, count));
        this.pending = this.pending.slice(count);
        continue;
      }

      const closingIndex = this.pending.indexOf("]");
      if (closingIndex === -1) {
        if (!flush && /^\[\d*$/.test(this.pending)) {
          return;
        }
        this.emitText("[");
        this.pending = this.pending.slice(1);
        continue;
      }

      const candidate = this.pending.slice(0, closingIndex + 1);
      const match = /^\[([1-9]\d*)\]$/.exec(candidate);
      const referenceIndex = match ? Number(match[1]) : Number.NaN;
      if (!match || !Number.isSafeInteger(referenceIndex) || referenceIndex <= 0) {
        this.emitText("[");
        this.pending = this.pending.slice(1);
        continue;
      }

      this.citations.push({
        referenceIndex,
        start: this.rawOffset,
        end: this.rawOffset + candidate.length,
        renderedOffset: this.renderedText.length,
      });
      this.rawOffset += candidate.length;
      this.pending = this.pending.slice(candidate.length);
    }
  }

  private emitText(value: string): void {
    this.renderedText += value;
    this.rawOffset += value.length;
  }
}

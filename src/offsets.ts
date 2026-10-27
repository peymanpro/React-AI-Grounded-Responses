import type { OffsetUnit, TextRange } from "./types.js";

export function countOffsetUnits(text: string, unit: OffsetUnit = "utf16"): number {
  return unit === "codePoint" ? Array.from(text).length : text.length;
}

/**
 * Converts an offset from the requested unit into a JavaScript string index.
 * Returns null when the offset is negative, not an integer, or beyond the text.
 */
export function offsetToUtf16(
  text: string,
  offset: number,
  unit: OffsetUnit = "utf16",
): number | null {
  if (!Number.isInteger(offset) || offset < 0) {
    return null;
  }

  if (unit === "utf16") {
    return offset <= text.length ? offset : null;
  }

  let codePoints = 0;
  let utf16Index = 0;

  for (const character of text) {
    if (codePoints === offset) {
      return utf16Index;
    }
    codePoints += 1;
    utf16Index += character.length;
  }

  return codePoints === offset ? utf16Index : null;
}

export function rangeToUtf16(
  text: string,
  range: TextRange,
): { readonly start: number; readonly end: number } | null {
  const unit = range.offsetUnit ?? "utf16";
  if (
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end <= range.start ||
    range.end > countOffsetUnits(text, unit)
  ) {
    return null;
  }

  const start = offsetToUtf16(text, range.start, unit);
  const end = offsetToUtf16(text, range.end, unit);
  if (start === null || end === null || end <= start) {
    return null;
  }

  return { start, end };
}

export function sliceByRange(text: string, range: TextRange): string | null {
  const converted = rangeToUtf16(text, range);
  return converted ? text.slice(converted.start, converted.end) : null;
}

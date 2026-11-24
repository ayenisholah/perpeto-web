/**
 * Lossless display formatting for decimal strings. Money, rates and prices
 * arrive from the API as strings and never pass through `Number`.
 */
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/u;

/** Rounds half away from zero to `places` fraction digits, with grouping. */
export function formatDecimal(value: string, places = 2): string {
  const match = DECIMAL.exec(value.trim());
  if (match === null) return value;
  const [, sign, whole, fraction = ""] = match;
  const padded = (fraction + "0".repeat(places + 1)).slice(0, places + 1);
  let scaled = BigInt(whole + padded.slice(0, places));
  if (padded.charCodeAt(places) >= "5".charCodeAt(0)) scaled += BigInt(1);
  const digits = scaled.toString().padStart(places + 1, "0");
  const intPart = digits.slice(0, digits.length - places) || "0";
  const fracPart = places > 0 ? `.${digits.slice(digits.length - places)}` : "";
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  const negative = sign === "-" && /[1-9]/u.test(digits);
  return `${negative ? "-" : ""}${grouped}${fracPart}`;
}

/** Moves the decimal point; `shiftDecimal(x, 2)` turns a fraction into a percentage. */
export function shiftDecimal(value: string, places: number): string {
  const match = DECIMAL.exec(value.trim());
  if (match === null) return value;
  const [, sign, whole, fraction = ""] = match;
  let digits = whole + fraction;
  let point = whole.length + places;
  if (point > digits.length) digits += "0".repeat(point - digits.length);
  if (point < 1) {
    digits = "0".repeat(1 - point) + digits;
    point = 1;
  }
  const intPart = digits.slice(0, point).replace(/^0+(?=\d)/u, "");
  const fracPart = digits.slice(point);
  return `${sign}${intPart}${fracPart.length > 0 ? `.${fracPart}` : ""}`;
}

export function formatPercent(fraction: string, places = 2): string {
  return `${formatDecimal(shiftDecimal(fraction, 2), places)}%`;
}

export function formatUsd(value: string): string {
  const formatted = formatDecimal(value, 2);
  return formatted.startsWith("-") ? `-$${formatted.slice(1)}` : `$${formatted}`;
}

export function isNegative(value: string): boolean {
  return /^\s*-/u.test(value) && /[1-9]/u.test(value);
}

export function formatTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

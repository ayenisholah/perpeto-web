import { describe, expect, it } from "vitest";

import { formatDecimal, formatPercent, formatTime, formatUsd, isNegative, shiftDecimal } from "./format";

describe("formatDecimal", () => {
  it.each([
    ["100000", 2, "100,000.00"],
    ["1234567.891", 2, "1,234,567.89"],
    ["0.005", 2, "0.01"],
    ["0.004", 2, "0.00"],
    ["-1234.5", 0, "-1,235"],
    ["-0.001", 2, "0.00"],
    ["99.995", 2, "100.00"],
    ["123456789012345678901234567890.125", 2, "123,456,789,012,345,678,901,234,567,890.13"],
  ])("formats %s to %d places as %s", (value, places, expected) => {
    expect(formatDecimal(value, places)).toBe(expected);
  });

  it("returns non-decimals unchanged", () => {
    expect(formatDecimal("n/a")).toBe("n/a");
  });
});

describe("shiftDecimal and formatPercent", () => {
  it.each([
    ["0.1534", 2, "15.34"],
    ["0.000012", 2, "0.0012"],
    ["5", 2, "500"],
    ["-0.25", 2, "-25"],
    ["12.5", -2, "0.125"],
  ])("shifts %s by %d to %s", (value, places, expected) => {
    expect(shiftDecimal(value, places)).toBe(expected);
  });

  it("formats fractions as percentages without floating point", () => {
    expect(formatPercent("0.1534")).toBe("15.34%");
    expect(formatPercent("0.72", 0)).toBe("72%");
    expect(formatPercent("-0.00015")).toBe("-0.02%");
  });
});

describe("formatUsd and isNegative", () => {
  it("puts the sign before the currency symbol", () => {
    expect(formatUsd("1180.5")).toBe("$1,180.50");
    expect(formatUsd("-42")).toBe("-$42.00");
  });

  it("treats negative zero as non-negative", () => {
    expect(isNegative("-0.00")).toBe(false);
    expect(isNegative("-0.01")).toBe(true);
    expect(isNegative("3")).toBe(false);
  });
});

describe("formatTime", () => {
  it("renders UTC minutes and handles missing values", () => {
    expect(formatTime("2026-11-24T09:05:23.523Z")).toBe("2026-11-24 09:05 UTC");
    expect(formatTime(null)).toBe("—");
    expect(formatTime("not a date")).toBe("not a date");
  });
});

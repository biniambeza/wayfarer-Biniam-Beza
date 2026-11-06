import { describe, expect, it } from "vitest";
import { formatRating, formatReviewCount } from "./format";

describe("formatRating", () => {
  it("always shows one decimal place", () => {
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(4.679)).toBe("4.7");
  });
});

describe("formatReviewCount", () => {
  it.each([
    [0, "No reviews yet"],
    [1, "1 review"],
    [312, "312 reviews"],
  ])("describes %i reviews", (count, text) => {
    expect(formatReviewCount(count)).toBe(text);
  });
});

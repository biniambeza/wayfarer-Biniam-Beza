import { describe, expect, it } from "vitest";
import {
  formatRating,
  formatReviewCount,
  formatReviewDate,
  formatSeats,
  formatSlotTime,
} from "./format";

describe("dates", () => {
  it("shows a slot's start in Addis Ababa time, whatever the device's zone", () => {
    expect(formatSlotTime("2026-11-08T06:00:00.000Z")).toBe("Sun 8 Nov, 09:00");
  });

  it("uses the Addis Ababa date for a review written late in UTC", () => {
    expect(formatReviewDate("2026-11-08T22:30:00.000Z")).toBe("9 Nov 2026");
  });
});

describe("formatSeats", () => {
  it("uses the right plural", () => {
    expect(formatSeats(1)).toBe("1 seat");
    expect(formatSeats(4)).toBe("4 seats");
  });
});

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

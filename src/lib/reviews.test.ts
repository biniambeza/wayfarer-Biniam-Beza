import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db/connection";
import { getPlaceDetail } from "./places";
import {
  findUserReview,
  MAX_REVIEW_LENGTH,
  parseReviewInput,
  saveReview,
} from "./reviews";

describe("parseReviewInput", () => {
  it("accepts a valid review and trims the text", () => {
    expect(parseReviewInput({ rating: 4, body: "  Lovely.  " })).toEqual({
      ok: true,
      input: { rating: 4, body: "Lovely." },
    });
  });

  it.each([
    ["too low", 0],
    ["too high", 6],
    ["not whole", 4.5],
    ["a string", "5"],
    ["missing", undefined],
  ])("rejects a rating that is %s", (_label, rating) => {
    const result = parseReviewInput({ rating, body: "Lovely." });

    expect(result.ok).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["not text", 123],
    ["missing", undefined],
    ["too long", "x".repeat(MAX_REVIEW_LENGTH + 1)],
  ])("rejects a body that is %s", (_label, body) => {
    const result = parseReviewInput({ rating: 5, body });

    expect(result.ok).toBe(false);
  });

  it("accepts a body of exactly the maximum length", () => {
    const body = "x".repeat(MAX_REVIEW_LENGTH);

    expect(parseReviewInput({ rating: 5, body }).ok).toBe(true);
  });

  it.each([null, undefined, "text", []])("rejects %j as input", (value) => {
    expect(parseReviewInput(value).ok).toBe(false);
  });
});

describe("saving reviews", () => {
  const PLACE = 1;
  const SARA = 1;
  const ABEL = 2;

  let db: Database;

  const reviewCount = () =>
    (db.prepare("SELECT COUNT(*) AS n FROM reviews").get() as { n: number }).n;

  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec(`
      INSERT INTO users (id, name, selectable) VALUES (1, 'Sara', 1), (2, 'Abel', 1);
      INSERT INTO places (id, name, category, description, opening_hours)
        VALUES (1, 'National Museum', 'History', 'Exhibits', '08:30-17:30');
    `);
  });

  afterEach(() => db.close());

  it("creates a review the first time", () => {
    const saved = saveReview(db, PLACE, SARA, { rating: 5, body: "Great." });

    expect(saved).toMatchObject({ placeId: PLACE, userId: SARA, rating: 5, body: "Great." });
    expect(reviewCount()).toBe(1);
  });

  it("updates the old review when the same user reviews again", () => {
    const first = saveReview(db, PLACE, SARA, { rating: 5, body: "Great." });
    db.prepare("UPDATE reviews SET created_at = '2020-01-01T00:00:00.000Z'").run();

    const second = saveReview(db, PLACE, SARA, { rating: 2, body: "Changed my mind." });

    expect(reviewCount()).toBe(1);
    expect(second).toMatchObject({
      id: first.id,
      rating: 2,
      body: "Changed my mind.",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
  });

  it("keeps separate reviews for different users", () => {
    saveReview(db, PLACE, SARA, { rating: 5, body: "Great." });
    saveReview(db, PLACE, ABEL, { rating: 3, body: "Fine." });

    expect(reviewCount()).toBe(2);
  });

  it("feeds an updated rating into the place's average", () => {
    saveReview(db, PLACE, SARA, { rating: 5, body: "Great." });
    saveReview(db, PLACE, ABEL, { rating: 3, body: "Fine." });

    saveReview(db, PLACE, ABEL, { rating: 1, body: "Worse than I remembered." });

    expect(getPlaceDetail(db, PLACE)).toMatchObject({ reviewCount: 2, averageRating: 3 });
  });

  it("finds only the given user's review", () => {
    saveReview(db, PLACE, SARA, { rating: 5, body: "Great." });

    expect(findUserReview(db, PLACE, SARA)?.body).toBe("Great.");
    expect(findUserReview(db, PLACE, ABEL)).toBeNull();
  });
});

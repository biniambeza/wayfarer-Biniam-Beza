import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./connection";
import { applySchema } from "./schema";

describe("database schema", () => {
  let db: Database;

  const insertReview = (rating: number, placeId = 1, userId = 1) =>
    db
      .prepare(
        "INSERT INTO reviews (place_id, user_id, rating, body) VALUES (?, ?, ?, 'text')",
      )
      .run(placeId, userId, rating);

  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec(`
      INSERT INTO users (id, name, selectable) VALUES (1, 'Sara', 1), (2, 'Abel', 1);
      INSERT INTO places (id, name, category, description, opening_hours)
        VALUES (1, 'National Museum', 'History', 'Exhibits', '08:30-17:30');
    `);
  });

  afterEach(() => db.close());

  it("allows only one review per user per place", () => {
    insertReview(5);

    expect(() => insertReview(4)).toThrow(/UNIQUE constraint failed/);
    expect(() => insertReview(4, 1, 2)).not.toThrow();
  });

  it.each([0, 6])("rejects a rating of %i", (rating) => {
    expect(() => insertReview(rating)).toThrow(/CHECK constraint failed/);
  });

  it.each([1, 5])("accepts a rating of %i", (rating) => {
    expect(() => insertReview(rating)).not.toThrow();
  });

  it("enforces foreign keys", () => {
    expect(() => insertReview(5, 999)).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("can be applied again without touching existing data", () => {
    insertReview(5);

    applySchema(db);

    expect(db.prepare("SELECT COUNT(*) AS n FROM reviews").get()).toEqual({ n: 1 });
  });
});

import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./connection";
import { seedDatabase } from "./seed";

interface PlaceStats {
  name: string;
  reviewCount: number;
  average: number;
}

describe("seedDatabase", () => {
  let db: Database;

  const placeStats = () =>
    db
      .prepare(
        `SELECT p.name, COUNT(r.id) AS reviewCount, AVG(r.rating) AS average
         FROM places p LEFT JOIN reviews r ON r.place_id = p.id
         GROUP BY p.id`,
      )
      .all() as PlaceStats[];

  beforeEach(() => {
    db = openDatabase(":memory:");
    seedDatabase(db);
  });

  afterEach(() => db.close());

  it("creates about 10 places, including some with only 1-2 reviews", () => {
    const stats = placeStats();

    expect(stats).toHaveLength(10);
    expect(stats.filter((p) => p.reviewCount <= 2).length).toBeGreaterThan(0);
  });

  it("offers exactly 3 users in the switcher", () => {
    const users = db.prepare("SELECT name FROM users WHERE selectable = 1").all();

    expect(users).toEqual([{ name: "Sara" }, { name: "Abel" }, { name: "Liya" }]);
  });

  it("recreates the brief's ranking trap", () => {
    const stats = placeStats();
    const museum = stats.find((p) => p.name === "National Museum of Ethiopia");
    const cafe = stats.find((p) => p.name === "Bole Corner Café");

    expect(museum?.reviewCount).toBe(312);
    expect(museum?.average).toBeCloseTo(4.7, 1);
    expect(cafe).toMatchObject({ reviewCount: 1, average: 5 });
  });

  it("does not overbook any slot, and has one full slot to demo", () => {
    const slots = db
      .prepare(
        `SELECT s.capacity, COALESCE(SUM(b.seats), 0) AS booked
         FROM tour_slots s LEFT JOIN bookings b ON b.slot_id = s.id
         GROUP BY s.id`,
      )
      .all() as { capacity: number; booked: number }[];

    expect(slots.every((s) => s.booked <= s.capacity)).toBe(true);
    expect(slots.some((s) => s.booked === s.capacity)).toBe(true);
  });

  it("schedules every slot in the future", () => {
    const now = new Date();
    seedDatabase(db, now);

    const { earliest } = db
      .prepare("SELECT MIN(starts_at) AS earliest FROM tour_slots")
      .get() as { earliest: string };

    expect(new Date(earliest).getTime()).toBeGreaterThan(now.getTime());
  });

  it("gives the same result when run again", () => {
    const before = placeStats();

    seedDatabase(db);

    expect(placeStats()).toEqual(before);
  });
});

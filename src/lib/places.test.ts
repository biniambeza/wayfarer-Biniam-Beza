import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db/connection";
import { seedDatabase } from "./db/seed";
import {
  getPlaceDetail,
  listCategories,
  listPlaces,
  RECENT_REVIEW_LIMIT,
} from "./places";

describe("places", () => {
  let db: Database;

  const names = (places: { name: string }[]) => places.map((p) => p.name);
  const idOf = (name: string) =>
    (db.prepare("SELECT id FROM places WHERE name = ?").get(name) as { id: number }).id;

  beforeEach(() => {
    db = openDatabase(":memory:");
    seedDatabase(db);
  });

  afterEach(() => db.close());

  describe("listPlaces", () => {
    it("sorts by ranking score, not by plain average", () => {
      const places = listPlaces(db, { category: null, sort: "top_rated" });

      expect(places[0].name).toBe("National Museum of Ethiopia");
      expect(names(places).indexOf("Bole Corner Café")).toBeGreaterThan(
        names(places).indexOf("Corner Coffee House"),
      );
    });

    it("sorts by name", () => {
      const sorted = names(listPlaces(db, { category: null, sort: "name" }));

      expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)));
    });

    it("filters by category and keeps the chosen sort", () => {
      const places = listPlaces(db, { category: "History", sort: "top_rated" });

      expect(names(places)).toEqual([
        "National Museum of Ethiopia",
        "Holy Trinity Cathedral",
        "Ethnological Museum",
      ]);
    });

    it("returns nothing for an unknown category", () => {
      expect(listPlaces(db, { category: "Nope", sort: "top_rated" })).toEqual([]);
    });

    it("counts each place's own reviews", () => {
      const places = listPlaces(db, { category: null, sort: "name" });
      const museum = places.find((p) => p.name === "National Museum of Ethiopia");

      expect(museum?.reviewCount).toBe(312);
      expect(museum?.averageRating).toBeCloseTo(4.68, 2);
    });
  });

  it("lists each category once", () => {
    expect(listCategories(db)).toEqual(["Culture", "Food", "History", "Nature"]);
  });

  describe("getPlaceDetail", () => {
    it("returns null for an unknown place", () => {
      expect(getPlaceDetail(db, 999_999)).toBeNull();
    });

    it("limits the reviews returned but rates using all of them", () => {
      const museum = getPlaceDetail(db, idOf("National Museum of Ethiopia"));

      expect(museum?.reviews).toHaveLength(RECENT_REVIEW_LIMIT);
      expect(museum?.reviewCount).toBe(312);
    });

    it("lists the newest reviews first with their authors", () => {
      const museum = getPlaceDetail(db, idOf("National Museum of Ethiopia"));

      expect(museum?.reviews[0]).toMatchObject({
        author: "Abel",
        rating: 5,
        body: "Go early, the guide is excellent.",
      });
    });

    it("works out seats left from the bookings, in time order", () => {
      const museum = getPlaceDetail(db, idOf("National Museum of Ethiopia"));

      expect(museum?.slots.map((s) => s.seatsLeft)).toEqual([4, 1, 0]);
    });

    it("leaves out slots that have already started", () => {
      const farFuture = new Date("2999-01-01T00:00:00.000Z");

      const museum = getPlaceDetail(db, idOf("National Museum of Ethiopia"), farFuture);

      expect(museum?.slots).toEqual([]);
    });

    it("returns an empty list for a place without tours", () => {
      expect(getPlaceDetail(db, idOf("Unity Park"))?.slots).toEqual([]);
    });
  });
});

import type { Database } from "better-sqlite3";
import { rankByScore, rankingScore } from "./ranking";

export const PLACE_SORTS = ["top_rated", "name"] as const;
export type PlaceSort = (typeof PLACE_SORTS)[number];

export function isPlaceSort(value: string): value is PlaceSort {
  return (PLACE_SORTS as readonly string[]).includes(value);
}

// A place's reviews can number in the hundreds, so the detail page only gets the
// latest ones. Its overall rating still uses every review.
export const RECENT_REVIEW_LIMIT = 20;

interface PlaceRow {
  id: number;
  name: string;
  category: string;
  reviewCount: number;
  averageRating: number;
}

export interface PlaceSummary extends PlaceRow {
  score: number;
}

export interface PlaceReview {
  id: number;
  userId: number;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface TourSlot {
  id: number;
  startsAt: string;
  capacity: number;
  seatsLeft: number;
}

export interface PlaceDetail extends PlaceSummary {
  description: string;
  openingHours: string;
  reviews: PlaceReview[];
  slots: TourSlot[];
}

const PLACE_COLUMNS = `
  p.id,
  p.name,
  p.category,
  COUNT(r.id) AS reviewCount,
  COALESCE(AVG(r.rating), 0) AS averageRating
`;

function withScore<T extends PlaceRow>(place: T): T & { score: number } {
  return { ...place, score: rankingScore(place) };
}

export function listPlaces(
  db: Database,
  { category, sort }: { category: string | null; sort: PlaceSort },
): PlaceSummary[] {
  const rows = db
    .prepare(
      `SELECT ${PLACE_COLUMNS}
       FROM places p
       LEFT JOIN reviews r ON r.place_id = p.id
       WHERE @category IS NULL OR p.category = @category
       GROUP BY p.id`,
    )
    .all({ category }) as PlaceRow[];

  // Scored here rather than in SQL so the list uses the same unit-tested function.
  // That reads every matching place per request: fine for one city, but a large
  // catalogue would need the score stored and indexed instead.
  const places = rows.map(withScore);
  return sort === "top_rated"
    ? rankByScore(places)
    : places.sort((a, b) => a.name.localeCompare(b.name));
}

export function listCategories(db: Database): string[] {
  const rows = db
    .prepare("SELECT DISTINCT category FROM places ORDER BY category")
    .all() as { category: string }[];
  return rows.map((row) => row.category);
}

export function placeExists(db: Database, placeId: number): boolean {
  return db.prepare("SELECT 1 FROM places WHERE id = ?").get(placeId) !== undefined;
}

export function getPlaceDetail(
  db: Database,
  placeId: number,
  now: Date = new Date(),
): PlaceDetail | null {
  const place = db
    .prepare(
      `SELECT ${PLACE_COLUMNS}, p.description, p.opening_hours AS openingHours
       FROM places p
       LEFT JOIN reviews r ON r.place_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
    )
    .get(placeId) as
    | (PlaceRow & { description: string; openingHours: string })
    | undefined;

  if (!place) return null;

  const reviews = db
    .prepare(
      `SELECT r.id, r.user_id AS userId, u.name AS author, r.rating, r.body,
              r.created_at AS createdAt
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.place_id = ?
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ?`,
    )
    .all(placeId, RECENT_REVIEW_LIMIT) as PlaceReview[];

  // Seats left is always worked out from the bookings, so there is no separate
  // counter that could disagree with them.
  const slots = db
    .prepare(
      `SELECT s.id, s.starts_at AS startsAt, s.capacity,
              s.capacity - COALESCE(SUM(b.seats), 0) AS seatsLeft
       FROM tour_slots s
       LEFT JOIN bookings b ON b.slot_id = s.id
       WHERE s.place_id = ? AND s.starts_at > ?
       GROUP BY s.id
       ORDER BY s.starts_at`,
    )
    .all(placeId, now.toISOString()) as TourSlot[];

  return { ...withScore(place), reviews, slots };
}

import type { Database } from "better-sqlite3";

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_REVIEW_LENGTH = 500;

export interface ReviewInput {
  rating: number;
  body: string;
}

export interface UserReview extends ReviewInput {
  id: number;
  placeId: number;
  userId: number;
  createdAt: string;
}

export type ParsedReviewInput =
  | { ok: true; input: ReviewInput }
  | { ok: false; error: string };

export function parseReviewInput(value: unknown): ParsedReviewInput {
  const { rating, body } = (value ?? {}) as { rating?: unknown; body?: unknown };

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < MIN_RATING ||
    rating > MAX_RATING
  ) {
    return {
      ok: false,
      error: `Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}.`,
    };
  }

  const text = typeof body === "string" ? body.trim() : "";
  if (!text) {
    return { ok: false, error: "Please write a short review." };
  }
  if (text.length > MAX_REVIEW_LENGTH) {
    return {
      ok: false,
      error: `Reviews can be at most ${MAX_REVIEW_LENGTH} characters.`,
    };
  }

  return { ok: true, input: { rating, body: text } };
}

const REVIEW_COLUMNS = `
  id,
  place_id AS placeId,
  user_id AS userId,
  rating,
  body,
  created_at AS createdAt
`;

// One atomic statement, so a double submit updates the review rather than
// failing on the unique constraint, as a separate check-then-insert could.
// created_at keeps the time of the first review.
export function saveReview(
  db: Database,
  placeId: number,
  userId: number,
  { rating, body }: ReviewInput,
): UserReview {
  return db
    .prepare(
      `INSERT INTO reviews (place_id, user_id, rating, body)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (place_id, user_id)
       DO UPDATE SET rating = excluded.rating, body = excluded.body
       RETURNING ${REVIEW_COLUMNS}`,
    )
    .get(placeId, userId, rating, body) as UserReview;
}

export function findUserReview(
  db: Database,
  placeId: number,
  userId: number,
): UserReview | null {
  const review = db
    .prepare(
      `SELECT ${REVIEW_COLUMNS} FROM reviews WHERE place_id = ? AND user_id = ?`,
    )
    .get(placeId, userId) as UserReview | undefined;
  return review ?? null;
}

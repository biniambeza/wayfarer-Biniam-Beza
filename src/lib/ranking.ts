export interface RatingSummary {
  reviewCount: number;
  averageRating: number; // use 0 when a place has no reviews
}

// How many reviews' worth of weight the prior carries. Below this many real
// reviews the prior dominates the score; above it the place's own ratings do.
export const PRIOR_WEIGHT = 10;

// The rating assumed for a place before there is evidence. It sits deliberately
// below what places typically earn, so an unproven place has to earn its rank.
export const PRIOR_RATING = 3.5;

/**
 * Bayesian average: blends a place's ratings with PRIOR_WEIGHT imaginary reviews
 * of PRIOR_RATING, so a small number of reviews can only move the score a little.
 * DECISIONS.md explains the choice of constants and where this breaks.
 */
export function rankingScore({ reviewCount, averageRating }: RatingSummary): number {
  return (
    (reviewCount * averageRating + PRIOR_WEIGHT * PRIOR_RATING) /
    (reviewCount + PRIOR_WEIGHT)
  );
}

/** Returns a new array, best first. Equal scores favour more reviews. */
export function rankByScore<T extends RatingSummary>(places: readonly T[]): T[] {
  return [...places].sort(
    (a, b) => rankingScore(b) - rankingScore(a) || b.reviewCount - a.reviewCount,
  );
}

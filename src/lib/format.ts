export function formatRating(averageRating: number): string {
  return averageRating.toFixed(1);
}

export function formatReviewCount(count: number): string {
  if (count === 0) return "No reviews yet";
  return count === 1 ? "1 review" : `${count} reviews`;
}

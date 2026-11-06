import { formatReviewDate } from "@/lib/format";
import { MAX_RATING } from "@/lib/reviews";
import type { PlaceReview } from "@/lib/places";

function Stars({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of ${MAX_RATING} stars`}
      className="tracking-tight text-amber-600"
    >
      {"★".repeat(rating)}
      <span className="text-stone-300">{"★".repeat(MAX_RATING - rating)}</span>
    </span>
  );
}

export function ReviewsList({
  reviews,
  totalCount,
}: {
  reviews: PlaceReview[];
  totalCount: number;
}) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-600">
        No reviews yet. Be the first to write one.
      </p>
    );
  }

  return (
    <>
      {totalCount > reviews.length && (
        <p className="mb-3 text-sm text-stone-500">
          Showing the {reviews.length} newest of {totalCount} reviews.
        </p>
      )}
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {reviews.map((review) => (
          <li key={review.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <Stars rating={review.rating} />
              <span className="text-xs text-stone-500">
                {formatReviewDate(review.createdAt)}
              </span>
            </div>
            <p className="mt-1 break-words text-stone-800">{review.body}</p>
            <p className="mt-1 text-sm text-stone-500">{review.author}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

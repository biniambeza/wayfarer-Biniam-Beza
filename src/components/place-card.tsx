import Link from "next/link";
import { formatRating, formatReviewCount } from "@/lib/format";
import type { PlaceSummary } from "@/lib/places";
import { PRIOR_WEIGHT } from "@/lib/ranking";

export function PlaceCard({ place }: { place: PlaceSummary }) {
  // The ranking discounts places below this many reviews, so say why a high
  // rating can sit low in the list.
  const hasFewReviews = place.reviewCount > 0 && place.reviewCount < PRIOR_WEIGHT;

  return (
    <li>
      <Link
        href={`/places/${place.id}`}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-stone-400"
      >
        <span>
          <span className="block font-medium text-stone-900">{place.name}</span>
          <span className="block text-sm text-stone-500">{place.category}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          {hasFewReviews && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Few reviews so far
            </span>
          )}
          {place.reviewCount > 0 && (
            <span className="font-semibold text-stone-900">
              {formatRating(place.averageRating)} ★
            </span>
          )}
          <span>{formatReviewCount(place.reviewCount)}</span>
        </span>
      </Link>
    </li>
  );
}

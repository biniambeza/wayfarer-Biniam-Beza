"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFetch } from "@/lib/client/use-fetch";
import { formatRating, formatReviewCount } from "@/lib/format";
import type { PlaceDetail as Place } from "@/lib/places";
import { useActingUser } from "./acting-user-provider";
import { ErrorMessage } from "./error-message";
import { ReviewForm } from "./review-form";
import { ReviewsList } from "./reviews-list";
import { TourSlots } from "./tour-slots";

const BACK_LINK = (
  <Link href="/" className="mb-4 inline-block text-sm text-stone-600 hover:underline">
    ← All places
  </Link>
);

export function PlaceDetailSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-8 w-2/3 animate-pulse rounded bg-stone-200/70" />
      <div className="h-16 animate-pulse rounded bg-stone-200/70" />
      <div className="h-40 animate-pulse rounded-lg bg-stone-200/70" />
      <div className="h-56 animate-pulse rounded-lg bg-stone-200/70" />
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return <h2 className="mb-3 text-lg font-semibold text-stone-900">{children}</h2>;
}

function PlaceContent({ place, refresh }: { place: Place; refresh: () => void }) {
  const { currentUser, status } = useActingUser();

  return (
    <>
      <h1 className="text-2xl font-semibold text-stone-900">{place.name}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {place.category} ·{" "}
        {place.reviewCount > 0 && (
          <>
            <span className="font-semibold text-stone-900">
              {formatRating(place.averageRating)} ★
            </span>{" "}
          </>
        )}
        {formatReviewCount(place.reviewCount)} · Open {place.openingHours}
      </p>
      <p className="mt-3 text-stone-700">{place.description}</p>

      <section className="mt-8">
        <SectionHeading>Guided tours</SectionHeading>
        <TourSlots slots={place.slots} onChanged={refresh} />
      </section>

      <section className="mt-8">
        <SectionHeading>Reviews</SectionHeading>
        <div className="mb-4">
          {currentUser ? (
            // The key starts the form afresh with the new user's own review.
            <ReviewForm
              key={currentUser.id}
              placeId={place.id}
              userId={currentUser.id}
              onSaved={refresh}
            />
          ) : status === "loading" ? (
            <div className="h-56 animate-pulse rounded-lg bg-stone-200/70" />
          ) : (
            <p className="text-sm text-stone-600">
              Choose who you are acting as to write a review.
            </p>
          )}
        </div>
        <ReviewsList reviews={place.reviews} totalCount={place.reviewCount} />
      </section>
    </>
  );
}

function PlaceLoader({ id }: { id: string }) {
  const { data, error, refetch } = useFetch<Place>(`/api/places/${id}`);

  if (data) {
    return (
      <>
        {error && (
          <div className="mb-4">
            <ErrorMessage
              message={`Could not refresh this page, so it may be out of date. ${error}`}
              onRetry={refetch}
            />
          </div>
        )}
        <PlaceContent place={data} refresh={refetch} />
      </>
    );
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }
  return <PlaceDetailSkeleton />;
}

export function PlaceDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      {BACK_LINK}
      {/* The key stops one place's data showing while the next one loads. */}
      <PlaceLoader key={id} id={id} />
    </>
  );
}

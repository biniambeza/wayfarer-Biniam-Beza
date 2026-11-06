import { Suspense } from "react";
import { PlacesBrowser, PlacesSkeleton } from "@/components/places-browser";

export default function HomePage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold text-stone-900">
        Places to visit in Addis Ababa
      </h1>
      <p className="mb-6 text-stone-600">
        Honest ratings, and guided tours that never get overbooked.
      </p>
      {/* useSearchParams needs a Suspense boundary when the page is prerendered. */}
      <Suspense fallback={<PlacesSkeleton />}>
        <PlacesBrowser />
      </Suspense>
    </>
  );
}

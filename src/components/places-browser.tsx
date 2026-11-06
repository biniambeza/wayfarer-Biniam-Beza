"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFetch } from "@/lib/client/use-fetch";
import { isPlaceSort, type PlaceSort, type PlaceSummary } from "@/lib/places";
import { ErrorMessage } from "./error-message";
import { PlaceCard } from "./place-card";

const SORT_LABELS: Record<PlaceSort, string> = {
  top_rated: "Top rated",
  name: "Name (A–Z)",
};

interface PlacesResponse {
  places: PlaceSummary[];
  categories: string[];
}

function buildQuery(category: string | null, sort: PlaceSort): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort !== "top_rated") params.set("sort", sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function PlacesSkeleton() {
  return (
    <ul aria-hidden="true" className="space-y-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="h-[66px] animate-pulse rounded-lg bg-stone-200/70" />
      ))}
    </ul>
  );
}

function CategoryFilter({
  categories,
  selected,
  sort,
}: {
  categories: string[];
  selected: string | null;
  sort: PlaceSort;
}) {
  const options = [null, ...categories];

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      {options.map((category) => {
        const isSelected = category === selected;
        return (
          <Link
            key={category ?? "all"}
            href={`/${buildQuery(category, sort)}`}
            scroll={false}
            aria-current={isSelected ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              isSelected
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
            }`}
          >
            {category ?? "All"}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlacesBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category");
  const sortParam = searchParams.get("sort") ?? "";
  const sort: PlaceSort = isPlaceSort(sortParam) ? sortParam : "top_rated";

  const apiQuery = new URLSearchParams({ sort });
  if (category) apiQuery.set("category", category);

  const { data, error, isLoading, refetch } = useFetch<PlacesResponse>(
    `/api/places?${apiQuery}`,
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <CategoryFilter
          categories={data?.categories ?? []}
          selected={category}
          sort={sort}
        />
        <label className="flex items-center gap-2 text-sm text-stone-600">
          Sort
          <select
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 font-medium text-stone-900"
            value={sort}
            onChange={(event) =>
              router.replace(
                `${pathname}${buildQuery(category, event.target.value as PlaceSort)}`,
                { scroll: false },
              )
            }
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sort === "top_rated" && (
        <p className="mb-4 text-sm text-stone-500">
          Ranked by rating and number of reviews, so a place needs more than one
          good review to reach the top.
        </p>
      )}

      {error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : !data ? (
        <PlacesSkeleton />
      ) : data.places.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-600">
          {category
            ? `No places found in “${category}”.`
            : "No places yet. Run npm run seed to add some."}
        </p>
      ) : (
        <ul
          aria-busy={isLoading}
          className={`space-y-3 transition-opacity ${isLoading ? "opacity-50" : ""}`}
        >
          {data.places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </ul>
      )}
    </>
  );
}

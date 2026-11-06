"use client";

import { type FormEvent, useState } from "react";
import { fetchJson } from "@/lib/client/fetch-json";
import { useFetch } from "@/lib/client/use-fetch";
import {
  MAX_RATING,
  MAX_REVIEW_LENGTH,
  MIN_RATING,
  type UserReview,
} from "@/lib/reviews";
import { ErrorMessage } from "./error-message";

const RATINGS = Array.from(
  { length: MAX_RATING - MIN_RATING + 1 },
  (_, i) => MIN_RATING + i,
);

function StarInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-sm font-medium text-stone-700">Your rating</legend>
      <div className="flex gap-1">
        {RATINGS.map((rating) => (
          <label
            key={rating}
            className={`cursor-pointer rounded text-2xl leading-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stone-900 ${
              value !== null && rating <= value
                ? "text-amber-500"
                : "text-stone-300 hover:text-amber-300"
            }`}
          >
            <input
              type="radio"
              name="rating"
              className="sr-only"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              aria-label={`${rating} out of ${MAX_RATING} stars`}
            />
            ★
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReviewFields({
  placeId,
  userId,
  existing,
  onSaved,
}: {
  placeId: number;
  userId: number;
  existing: UserReview | null;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? null);
  const [body, setBody] = useState(existing?.body ?? "");
  const [hasReview, setHasReview] = useState(existing !== null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    if (rating === null) {
      setError("Please choose a star rating.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/places/${placeId}/review`, {
        method: "PUT",
        userId,
        body: { rating, body },
      });
      setHasReview(true);
      setSaved(true);
      onSaved();
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-stone-200 bg-white p-4"
    >
      <StarInput
        value={rating}
        onChange={(value) => {
          setRating(value);
          setSaved(false);
        }}
      />
      <label className="block text-sm font-medium text-stone-700">
        {hasReview ? "Your review" : "Write a short review"}
        <textarea
          name="body"
          className="mt-1 block w-full rounded-md border border-stone-300 p-2 font-normal text-stone-900"
          rows={3}
          maxLength={MAX_REVIEW_LENGTH}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
        />
      </label>
      <p className="mt-1 text-right text-xs text-stone-500">
        {body.length} / {MAX_REVIEW_LENGTH}
      </p>

      {error && (
        <div className="mb-3">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : hasReview ? "Update review" : "Submit review"}
        </button>
        {saved && (
          <p role="status" className="text-sm text-green-800">
            Your review was saved.
          </p>
        )}
        {hasReview && !saved && (
          <p className="text-sm text-stone-500">
            Saving replaces your earlier review.
          </p>
        )}
      </div>
    </form>
  );
}

/** Loads the acting user's own review first, so the fields can start filled in. */
export function ReviewForm({
  placeId,
  userId,
  onSaved,
}: {
  placeId: number;
  userId: number;
  onSaved: () => void;
}) {
  const { data, error, refetch } = useFetch<{ review: UserReview | null }>(
    `/api/places/${placeId}/review`,
    userId,
  );

  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) {
    return <div className="h-56 animate-pulse rounded-lg bg-stone-200/70" />;
  }
  return (
    <ReviewFields
      placeId={placeId}
      userId={userId}
      existing={data.review}
      onSaved={onSaved}
    />
  );
}

// Always the city's time, so a tour's start doesn't shift with the viewer's device.
const TIME_ZONE = "Africa/Addis_Ababa";

const SLOT_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const REVIEW_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatSlotTime(isoDate: string): string {
  return SLOT_TIME.format(new Date(isoDate));
}

export function formatReviewDate(isoDate: string): string {
  return REVIEW_DATE.format(new Date(isoDate));
}

export function formatSeats(count: number): string {
  return count === 1 ? "1 seat" : `${count} seats`;
}

export function formatRating(averageRating: number): string {
  return averageRating.toFixed(1);
}

export function formatReviewCount(count: number): string {
  if (count === 0) return "No reviews yet";
  return count === 1 ? "1 review" : `${count} reviews`;
}

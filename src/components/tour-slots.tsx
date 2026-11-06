"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/client/fetch-json";
import { formatSeats, formatSlotTime } from "@/lib/format";
import type { TourSlot } from "@/lib/places";
import { useActingUser } from "./acting-user-provider";

type Outcome = { kind: "success" | "error"; text: string };

function SlotRow({
  slot,
  onChanged,
}: {
  slot: TourSlot;
  onChanged: () => void;
}) {
  const { currentUser } = useActingUser();
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // A second click can land before the re-render that disables the button, so
  // isBooking alone would let a double click book twice. A ref updates at once.
  const requestInFlight = useRef(false);

  const isFull = slot.seatsLeft === 0;
  // Seats left can fall after a refresh, so the choice can't be taken as still valid.
  const seats = Math.min(requestedSeats, Math.max(slot.seatsLeft, 1));
  const time = formatSlotTime(slot.startsAt);

  async function book() {
    if (!currentUser || requestInFlight.current) return;

    requestInFlight.current = true;
    setIsBooking(true);
    setOutcome(null);
    try {
      await fetchJson(`/api/slots/${slot.id}/bookings`, {
        method: "POST",
        userId: currentUser.id,
        body: { seats },
      });
      setOutcome({
        kind: "success",
        text: `Booked ${formatSeats(seats)} for ${currentUser.name}.`,
      });
      setRequestedSeats(1);
    } catch (error) {
      setOutcome({ kind: "error", text: (error as Error).message });
    } finally {
      requestInFlight.current = false;
      setIsBooking(false);
      // After a refusal too: someone else took seats, so this page is out of date.
      onChanged();
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-stone-900">{time}</p>
          <p className={`text-sm ${isFull ? "text-red-700" : "text-stone-600"}`}>
            {isFull
              ? "Fully booked"
              : `${slot.seatsLeft} of ${slot.capacity} seats left`}
          </p>
        </div>

        {!isFull && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-stone-600">
              Seats
              <select
                className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-900"
                value={seats}
                disabled={isBooking}
                onChange={(event) => setRequestedSeats(Number(event.target.value))}
              >
                {Array.from({ length: slot.seatsLeft }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={book}
              disabled={isBooking || !currentUser}
              className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
            >
              {isBooking ? "Booking…" : "Book"}
            </button>
          </div>
        )}
      </div>

      {outcome && (
        <p
          role={outcome.kind === "error" ? "alert" : "status"}
          className={`mt-2 rounded-md px-3 py-2 text-sm ${
            outcome.kind === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {outcome.text}
        </p>
      )}
    </li>
  );
}

export function TourSlots({
  slots,
  onChanged,
}: {
  slots: TourSlot[];
  onChanged: () => void;
}) {
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-600">
        No guided tours are scheduled here right now.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} onChanged={onChanged} />
        ))}
      </ul>
      <p className="mt-2 text-xs text-stone-500">Times are in Addis Ababa time.</p>
    </>
  );
}

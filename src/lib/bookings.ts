import type { Database } from "better-sqlite3";

export type BookingFailure =
  | { ok: false; reason: "slot_not_found" }
  | { ok: false; reason: "slot_started" }
  | { ok: false; reason: "not_enough_seats"; seatsLeft: number };

export type BookingResult =
  | {
      ok: true;
      bookingId: number;
      seats: number;
      seatsLeft: number;
      replayed: boolean; // true when this repeats an earlier, successful request
    }
  | BookingFailure;

export interface BookingRequest {
  slotId: number;
  userId: number;
  seats: number;
  now?: Date;
  idempotencyKey?: string;
}

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

export function isValidIdempotencyKey(key: string): boolean {
  return key.length > 0 && key.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}

export function isValidSeatCount(seats: unknown): seats is number {
  return Number.isSafeInteger(seats) && (seats as number) >= 1;
}

export function describeBookingFailure(failure: BookingFailure): string {
  switch (failure.reason) {
    case "slot_not_found":
      return "This tour could not be found.";
    case "slot_started":
      return "This tour has already started.";
    case "not_enough_seats":
      if (failure.seatsLeft === 0) return "This tour is fully booked.";
      return failure.seatsLeft === 1
        ? "Only 1 seat is left on this tour."
        : `Only ${failure.seatsLeft} seats are left on this tour.`;
  }
}

function readSlot(db: Database, slotId: number) {
  return db
    .prepare(
      `SELECT s.starts_at AS startsAt,
              s.capacity - COALESCE(SUM(b.seats), 0) AS seatsLeft
       FROM tour_slots s
       LEFT JOIN bookings b ON b.slot_id = s.id
       WHERE s.id = ?
       GROUP BY s.id`,
    )
    .get(slotId) as { startsAt: string; seatsLeft: number } | undefined;
}

// The seat check and the insert must act as one step, or two processes can both
// see the last seat as free and both book it. BEGIN IMMEDIATE takes SQLite's write
// lock before the check runs, so other writers wait until this booking commits and
// then see its seats. A plain (deferred) transaction is not enough: it reads first
// and takes the lock at the insert, and if another booking committed in between,
// SQLite fails it with "database is locked" (17 of 80 requests in the parallel test).
export function bookSeats(
  db: Database,
  { slotId, userId, seats, now = new Date(), idempotencyKey }: BookingRequest,
): BookingResult {
  const checkAndInsert = db.transaction((): BookingResult => {
    const slot = readSlot(db, slotId);

    if (!slot) return { ok: false, reason: "slot_not_found" };

    // Checked before the seats and the start time: a retry of a booking that worked
    // must still report success, even if the slot has since filled up or started.
    const original = idempotencyKey
      ? (db
          .prepare(
            `SELECT id, seats FROM bookings
             WHERE slot_id = ? AND user_id = ? AND idempotency_key = ?`,
          )
          .get(slotId, userId, idempotencyKey) as
          | { id: number; seats: number }
          | undefined)
      : undefined;
    if (original) {
      return {
        ok: true,
        bookingId: original.id,
        seats: original.seats,
        seatsLeft: slot.seatsLeft,
        replayed: true,
      };
    }

    if (slot.startsAt <= now.toISOString()) {
      return { ok: false, reason: "slot_started" };
    }
    if (seats > slot.seatsLeft) {
      return { ok: false, reason: "not_enough_seats", seatsLeft: slot.seatsLeft };
    }

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO bookings (slot_id, user_id, seats, idempotency_key)
         VALUES (?, ?, ?, ?)`,
      )
      .run(slotId, userId, seats, idempotencyKey ?? null);

    return {
      ok: true,
      bookingId: Number(lastInsertRowid),
      seats,
      seatsLeft: slot.seatsLeft - seats,
      replayed: false,
    };
  });

  return checkAndInsert.immediate();
}

import type { Database } from "better-sqlite3";

export type BookingFailure =
  | { ok: false; reason: "slot_not_found" }
  | { ok: false; reason: "slot_started" }
  | { ok: false; reason: "not_enough_seats"; seatsLeft: number };

export type BookingResult =
  | { ok: true; bookingId: number; seats: number; seatsLeft: number }
  | BookingFailure;

export interface BookingRequest {
  slotId: number;
  userId: number;
  seats: number;
  now?: Date;
}

export function isValidSeatCount(seats: unknown): seats is number {
  return Number.isSafeInteger(seats) && (seats as number) >= 1;
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

// KNOWN BUG: checks the seats and then inserts as two separate steps, so two
// processes can both see the last seat as free and both book it.
export function bookSeats(
  db: Database,
  { slotId, userId, seats, now = new Date() }: BookingRequest,
): BookingResult {
  const slot = readSlot(db, slotId);

  if (!slot) return { ok: false, reason: "slot_not_found" };
  if (slot.startsAt <= now.toISOString()) {
    return { ok: false, reason: "slot_started" };
  }
  if (seats > slot.seatsLeft) {
    return { ok: false, reason: "not_enough_seats", seatsLeft: slot.seatsLeft };
  }

  const { lastInsertRowid } = db
    .prepare("INSERT INTO bookings (slot_id, user_id, seats) VALUES (?, ?, ?)")
    .run(slotId, userId, seats);

  return {
    ok: true,
    bookingId: Number(lastInsertRowid),
    seats,
    seatsLeft: slot.seatsLeft - seats,
  };
}

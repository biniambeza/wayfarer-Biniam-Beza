import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bookSeats, describeBookingFailure, isValidSeatCount } from "./bookings";
import { openDatabase } from "./db/connection";

describe("isValidSeatCount", () => {
  it("accepts a positive whole number", () => {
    expect(isValidSeatCount(1)).toBe(true);
    expect(isValidSeatCount(4)).toBe(true);
  });

  it.each([0, -1, 1.5, "2", null, undefined, Number.MAX_VALUE, NaN])(
    "rejects %j",
    (value) => {
      expect(isValidSeatCount(value)).toBe(false);
    },
  );
});

describe("describeBookingFailure", () => {
  it.each([
    [0, "This tour is fully booked."],
    [1, "Only 1 seat is left on this tour."],
    [3, "Only 3 seats are left on this tour."],
  ])("explains a slot with %i seats left", (seatsLeft, message) => {
    const failure = { ok: false, reason: "not_enough_seats", seatsLeft } as const;

    expect(describeBookingFailure(failure)).toBe(message);
  });
});

describe("bookSeats", () => {
  const SLOT = 1;
  const SARA = 1;
  const BEFORE_START = new Date("2030-01-01T08:00:00.000Z");

  let db: Database;

  const book = (seats: number, now = BEFORE_START) =>
    bookSeats(db, { slotId: SLOT, userId: SARA, seats, now });

  const bookingCount = () =>
    (db.prepare("SELECT COUNT(*) AS n FROM bookings").get() as { n: number }).n;

  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec(`
      INSERT INTO users (id, name, selectable) VALUES (1, 'Sara', 1);
      INSERT INTO places (id, name, category, description, opening_hours)
        VALUES (1, 'National Museum', 'History', 'Exhibits', '08:30-17:30');
      INSERT INTO tour_slots (id, place_id, starts_at, capacity)
        VALUES (1, 1, '2030-01-01T09:00:00.000Z', 5);
    `);
  });

  afterEach(() => db.close());

  it("books seats and reports how many are left", () => {
    expect(book(2)).toMatchObject({ ok: true, seats: 2, seatsLeft: 3 });
  });

  it("allows booking exactly the seats that are left", () => {
    book(3);

    expect(book(2)).toMatchObject({ ok: true, seatsLeft: 0 });
  });

  it("rejects a booking for more seats than are left, and saves nothing", () => {
    book(4);

    expect(book(2)).toEqual({ ok: false, reason: "not_enough_seats", seatsLeft: 1 });
    expect(bookingCount()).toBe(1);
  });

  it("rejects any booking once the slot is full", () => {
    book(5);

    expect(book(1)).toEqual({ ok: false, reason: "not_enough_seats", seatsLeft: 0 });
  });

  it("rejects a slot that does not exist", () => {
    const result = bookSeats(db, { slotId: 999, userId: SARA, seats: 1, now: BEFORE_START });

    expect(result).toEqual({ ok: false, reason: "slot_not_found" });
  });

  it("rejects a slot that has already started", () => {
    const atStart = new Date("2030-01-01T09:00:00.000Z");

    expect(book(1, atStart)).toEqual({ ok: false, reason: "slot_started" });
    expect(bookingCount()).toBe(0);
  });
});

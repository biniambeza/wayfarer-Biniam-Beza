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

  describe("with an idempotency key", () => {
    const bookWithKey = (seats: number, overrides = {}) =>
      bookSeats(db, {
        slotId: SLOT,
        userId: SARA,
        seats,
        now: BEFORE_START,
        idempotencyKey: "attempt-1",
        ...overrides,
      });

    it("returns the original booking when a request is retried", () => {
      const first = bookWithKey(2);
      const retry = bookWithKey(2);

      expect(first).toMatchObject({ ok: true, replayed: false, seatsLeft: 3 });
      expect(retry).toMatchObject({
        ok: true,
        replayed: true,
        seatsLeft: 3,
        bookingId: (first as { bookingId: number }).bookingId,
      });
      expect(bookingCount()).toBe(1);
    });

    it("still succeeds on retry after the slot has filled up", () => {
      bookWithKey(2);
      book(3);

      expect(bookWithKey(2)).toMatchObject({ ok: true, replayed: true, seatsLeft: 0 });
      expect(bookingCount()).toBe(2);
    });

    it("still succeeds on retry after the slot has started", () => {
      bookWithKey(2);

      const retry = bookWithKey(2, { now: new Date("2030-01-01T09:30:00.000Z") });

      expect(retry).toMatchObject({ ok: true, replayed: true });
    });

    it("reports the seats of the original booking, not the retry", () => {
      bookWithKey(2);

      expect(bookWithKey(4)).toMatchObject({ ok: true, replayed: true, seats: 2 });
    });

    it("books again with a different key", () => {
      bookWithKey(1);

      expect(bookWithKey(1, { idempotencyKey: "attempt-2" })).toMatchObject({
        ok: true,
        replayed: false,
      });
      expect(bookingCount()).toBe(2);
    });

    it("does not let another user's key match", () => {
      db.exec("INSERT INTO users (id, name, selectable) VALUES (2, 'Abel', 1)");
      bookWithKey(1);

      expect(bookWithKey(1, { userId: 2 })).toMatchObject({ ok: true, replayed: false });
      expect(bookingCount()).toBe(2);
    });

    it("does not match the same key on another slot", () => {
      db.exec(`INSERT INTO tour_slots (id, place_id, starts_at, capacity)
               VALUES (2, 1, '2030-01-01T11:00:00.000Z', 5)`);
      bookWithKey(1);

      expect(bookWithKey(1, { slotId: 2 })).toMatchObject({ ok: true, replayed: false });
      expect(bookingCount()).toBe(2);
    });

    it("treats requests without a key as separate bookings", () => {
      book(1);
      book(1);

      expect(bookingCount()).toBe(2);
    });
  });

  it("rejects a slot that has already started", () => {
    const atStart = new Date("2030-01-01T09:00:00.000Z");

    expect(book(1, atStart)).toEqual({ ok: false, reason: "slot_started" });
    expect(bookingCount()).toBe(0);
  });
});

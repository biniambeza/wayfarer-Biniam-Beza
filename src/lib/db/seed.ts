import type { Database } from "better-sqlite3";
import {
  CROWD_REVIEW_TEXT,
  PLACES,
  SELECTABLE_USERS,
  type SeedPlace,
} from "./seed-data";

const ADDIS_UTC_OFFSET_HOURS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SEATS_PER_SEEDED_BOOKING = 3;

function crowdRatings(place: SeedPlace): number[] {
  const { oneStar, twoStar, threeStar, fourStar, fiveStar } = place.crowd;
  return [
    ...Array<number>(oneStar).fill(1),
    ...Array<number>(twoStar).fill(2),
    ...Array<number>(threeStar).fill(3),
    ...Array<number>(fourStar).fill(4),
    ...Array<number>(fiveStar).fill(5),
  ];
}

function slotStartTime(now: Date, daysFromNow: number, hour: number): string {
  const startsAt = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysFromNow,
    hour - ADDIS_UTC_OFFSET_HOURS,
  );
  return new Date(startsAt).toISOString();
}

// Replaces all data, so running the seed again gives a known starting point.
export function seedDatabase(db: Database, now: Date = new Date()): void {
  const insertUser = db.prepare(
    "INSERT INTO users (name, selectable) VALUES (?, ?)",
  );
  const insertPlace = db.prepare(
    "INSERT INTO places (name, category, description, opening_hours) VALUES (?, ?, ?, ?)",
  );
  const insertReview = db.prepare(
    "INSERT INTO reviews (place_id, user_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertSlot = db.prepare(
    "INSERT INTO tour_slots (place_id, starts_at, capacity) VALUES (?, ?, ?)",
  );
  const insertBooking = db.prepare(
    "INSERT INTO bookings (slot_id, user_id, seats) VALUES (?, ?, ?)",
  );

  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * DAY_MS).toISOString();

  db.transaction(() => {
    db.exec(`
      DELETE FROM bookings;
      DELETE FROM tour_slots;
      DELETE FROM reviews;
      DELETE FROM places;
      DELETE FROM users;
    `);

    const selectableIds = new Map<string, number>();
    for (const name of SELECTABLE_USERS) {
      const { lastInsertRowid } = insertUser.run(name, 1);
      selectableIds.set(name, Number(lastInsertRowid));
    }

    // Each place draws from the same pool, so it must fit the busiest place.
    const crowdSize = Math.max(...PLACES.map((p) => crowdRatings(p).length));
    const crowdUserIds: number[] = [];
    for (let i = 1; i <= crowdSize; i++) {
      const { lastInsertRowid } = insertUser.run(`Traveller ${i}`, 0);
      crowdUserIds.push(Number(lastInsertRowid));
    }

    let nextBookingUser = 0;

    for (const place of PLACES) {
      const placeId = Number(
        insertPlace.run(
          place.name,
          place.category,
          place.description,
          place.openingHours,
        ).lastInsertRowid,
      );

      place.namedReviews.forEach((review, i) => {
        // Most recent, so they appear at the top of the reviews list.
        insertReview.run(
          placeId,
          selectableIds.get(review.user),
          review.rating,
          review.body,
          daysAgo(i + 1),
        );
      });

      crowdRatings(place).forEach((rating, i) => {
        const texts = CROWD_REVIEW_TEXT[rating];
        // Ratings are generated in order; the stride spreads them across dates
        // so the most recent reviews are not all the same star rating.
        const age = 10 + ((i * 37) % 365);
        insertReview.run(
          placeId,
          crowdUserIds[i],
          rating,
          texts[i % texts.length],
          daysAgo(age),
        );
      });

      for (const slot of place.slots) {
        const slotId = Number(
          insertSlot.run(
            placeId,
            slotStartTime(now, slot.daysFromNow, slot.hour),
            slot.capacity,
          ).lastInsertRowid,
        );

        let seatsLeftToBook = slot.bookedSeats;
        while (seatsLeftToBook > 0) {
          const seats = Math.min(seatsLeftToBook, MAX_SEATS_PER_SEEDED_BOOKING);
          const userId = crowdUserIds[nextBookingUser++ % crowdUserIds.length];
          insertBooking.run(slotId, userId, seats);
          seatsLeftToBook -= seats;
        }
      }
    }
  })();
}

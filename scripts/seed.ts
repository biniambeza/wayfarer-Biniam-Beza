import { getDb } from "../src/lib/db/connection";
import { seedDatabase } from "../src/lib/db/seed";

const db = getDb();
seedDatabase(db);

const count = (table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

console.log(
  `Seeded ${count("places")} places, ${count("reviews")} reviews, ` +
    `${count("tour_slots")} tour slots and ${count("bookings")} bookings.`,
);

import type { Database } from "better-sqlite3";

// Kept as a TypeScript string rather than a .sql file so it needs no file
// lookup at runtime, which would depend on how Next.js bundles the server code.
//
// users.selectable separates the 3 people in the "acting as" switcher from the
// background reviewers. One review per user per place means a place can only
// have as many reviews as there are users, so a place with 312 reviews needs at
// least 312 users.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    selectable INTEGER NOT NULL DEFAULT 0 CHECK (selectable IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS places (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT NOT NULL,
    opening_hours TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY,
    place_id   INTEGER NOT NULL REFERENCES places (id),
    user_id    INTEGER NOT NULL REFERENCES users (id),
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (place_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS tour_slots (
    id        INTEGER PRIMARY KEY,
    place_id  INTEGER NOT NULL REFERENCES places (id),
    starts_at TEXT    NOT NULL,
    capacity  INTEGER NOT NULL CHECK (capacity > 0)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id         INTEGER PRIMARY KEY,
    slot_id    INTEGER NOT NULL REFERENCES tour_slots (id),
    user_id    INTEGER NOT NULL REFERENCES users (id),
    seats      INTEGER NOT NULL CHECK (seats > 0),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tour_slots_place_id ON tour_slots (place_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings (slot_id);
`;

export function applySchema(db: Database): void {
  db.exec(SCHEMA);
}

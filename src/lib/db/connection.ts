import path from "node:path";
import Database from "better-sqlite3";
import { applySchema } from "./schema";

const DEFAULT_DB_PATH = path.join(process.cwd(), "wayfarer.db");

// How long a connection waits for another writer before failing with SQLITE_BUSY.
const BUSY_TIMEOUT_MS = 5000;

export function openDatabase(filename: string): Database.Database {
  const db = new Database(filename, { timeout: BUSY_TIMEOUT_MS });
  // WAL lets readers keep working while a booking is being written.
  db.pragma("journal_mode = WAL");
  // SQLite ignores foreign keys unless this is turned on for each connection.
  db.pragma("foreign_keys = ON");
  applySchema(db);
  return db;
}

// Stored on globalThis because Next.js dev reloads modules on every edit, which
// would otherwise open a new connection each time.
const globalForDb = globalThis as typeof globalThis & {
  wayfarerDb?: Database.Database;
};

export function getDb(): Database.Database {
  globalForDb.wayfarerDb ??= openDatabase(DEFAULT_DB_PATH);
  return globalForDb.wayfarerDb;
}

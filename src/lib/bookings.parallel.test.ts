import { type ChildProcess, fork } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db/connection";
import type { WorkerReport } from "./testing/booking-worker";

// better-sqlite3 is synchronous, so calls inside one process run one at a time and
// can never interleave. A test using Promise.all would pass even on unsafe code.
// Real parallelism needs separate processes, each with its own connection to the
// same database file, which is also what several server instances would look like.
const WORKER_PATH = fileURLToPath(
  new URL("./testing/booking-worker.ts", import.meta.url),
);
const WORKER_COUNT = 16;
const ATTEMPTS_PER_WORKER = 5;

const CAPACITY = 10;
const ALREADY_BOOKED = 8;
const SEATS_LEFT = CAPACITY - ALREADY_BOOKED;
const SLOT = 1;
const USER = 1;

function startWorker(dbPath: string): { child: ChildProcess; ready: Promise<void> } {
  const child = fork(
    WORKER_PATH,
    [dbPath, String(SLOT), String(USER), String(ATTEMPTS_PER_WORKER)],
    { execArgv: ["--import", "tsx"] },
  );
  const ready = new Promise<void>((resolve, reject) => {
    child.once("message", () => resolve());
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`Worker exited early: ${code}`)));
  });
  return { child, ready };
}

function reportFrom(child: ChildProcess): Promise<WorkerReport> {
  return new Promise((resolve) => {
    child.once("message", (report) => resolve(report as WorkerReport));
  });
}

describe("booking under parallel requests", () => {
  let directory: string;
  let db: Database;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "wayfarer-parallel-"));
    db = openDatabase(path.join(directory, "test.db"));
    db.exec(`
      INSERT INTO users (id, name, selectable) VALUES (1, 'Sara', 1);
      INSERT INTO places (id, name, category, description, opening_hours)
        VALUES (1, 'National Museum', 'History', 'Exhibits', '08:30-17:30');
      INSERT INTO tour_slots (id, place_id, starts_at, capacity)
        VALUES (1, 1, '2999-01-01T09:00:00.000Z', ${CAPACITY});
      INSERT INTO bookings (slot_id, user_id, seats)
        VALUES (1, 1, ${ALREADY_BOOKED});
    `);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true, maxRetries: 5 });
  });

  it(
    "never overbooks a nearly full slot",
    async () => {
      const workers = Array.from({ length: WORKER_COUNT }, () =>
        startWorker(db.name),
      );
      await Promise.all(workers.map((worker) => worker.ready));

      // Collect the reports before sending "go" so that none can be missed.
      const reports = workers.map(({ child }) => {
        child.removeAllListeners("exit");
        return reportFrom(child);
      });
      for (const { child } of workers) child.send("go");
      const results = await Promise.all(reports);

      const { booked } = db
        .prepare("SELECT SUM(seats) AS booked FROM bookings WHERE slot_id = ?")
        .get(SLOT) as { booked: number };
      const newlyBooked = results.reduce((sum, r) => sum + r.seatsBooked, 0);
      const rejected = results.reduce((sum, r) => sum + r.rejected, 0);

      expect(results.flatMap((r) => r.errors)).toEqual([]);
      expect(booked).toBe(CAPACITY);
      expect(newlyBooked).toBe(SEATS_LEFT);
      expect(rejected).toBe(WORKER_COUNT * ATTEMPTS_PER_WORKER - SEATS_LEFT);
    },
    60_000,
  );
});

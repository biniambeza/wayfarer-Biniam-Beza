// Runs in its own process for bookings.parallel.test.ts. It makes a real database
// connection and waits for the "go" message, so all workers start booking together.
import { bookSeats } from "../bookings";
import { openDatabase } from "../db/connection";

export interface WorkerReport {
  seatsBooked: number;
  rejected: number;
  errors: string[];
}

const [dbPath, slotId, userId, attempts] = process.argv.slice(2);
const db = openDatabase(dbPath);

process.once("message", () => {
  const report: WorkerReport = { seatsBooked: 0, rejected: 0, errors: [] };

  for (let i = 0; i < Number(attempts); i++) {
    try {
      const result = bookSeats(db, {
        slotId: Number(slotId),
        userId: Number(userId),
        seats: 1,
      });
      if (result.ok) report.seatsBooked += result.seats;
      else report.rejected++;
    } catch (error) {
      report.errors.push(String(error));
    }
  }

  db.close();
  process.send?.(report, () => process.exit(0));
});

process.send?.("ready");

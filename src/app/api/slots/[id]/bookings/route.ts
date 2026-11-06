import type { NextRequest } from "next/server";
import {
  bookSeats,
  describeBookingFailure,
  isValidSeatCount,
} from "@/lib/bookings";
import { getDb } from "@/lib/db/connection";
import { getActingUser, parseId } from "@/lib/users";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/slots/[id]/bookings">,
) {
  const db = getDb();

  const user = getActingUser(db, request.headers);
  if (!user) {
    return Response.json(
      { error: "Choose who you are acting as first." },
      { status: 401 },
    );
  }

  const slotId = parseId((await context.params).id);
  if (slotId === null) {
    return Response.json(
      { error: "This tour could not be found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    seats?: unknown;
  } | null;
  const seats = body?.seats;
  if (!isValidSeatCount(seats)) {
    return Response.json(
      { error: "Seats must be a whole number of at least 1." },
      { status: 400 },
    );
  }

  const result = bookSeats(db, { slotId, userId: user.id, seats });

  if (!result.ok) {
    return Response.json(
      {
        error: describeBookingFailure(result),
        reason: result.reason,
        seatsLeft: result.reason === "not_enough_seats" ? result.seatsLeft : null,
      },
      { status: result.reason === "slot_not_found" ? 404 : 409 },
    );
  }

  return Response.json(
    {
      booking: { id: result.bookingId, slotId, seats: result.seats },
      seatsLeft: result.seatsLeft,
    },
    { status: 201 },
  );
}

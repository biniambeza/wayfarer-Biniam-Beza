import type { Database } from "better-sqlite3";
import { connection, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/connection";
import { placeExists } from "@/lib/places";
import { findUserReview, parseReviewInput, saveReview } from "@/lib/reviews";
import { getActingUser, parseId, type User } from "@/lib/users";

type Context = RouteContext<"/api/places/[id]/review">;

type ReviewTarget =
  | { user: User; placeId: number; failure?: never }
  | { failure: Response };

// Both methods act on "the current user's review of this place".
async function resolveTarget(
  db: Database,
  request: NextRequest,
  context: Context,
): Promise<ReviewTarget> {
  const user = getActingUser(db, request.headers);
  if (!user) {
    return {
      failure: Response.json(
        { error: "Choose who you are acting as first." },
        { status: 401 },
      ),
    };
  }

  const placeId = parseId((await context.params).id);
  if (placeId === null || !placeExists(db, placeId)) {
    return {
      failure: Response.json({ error: "Place not found" }, { status: 404 }),
    };
  }

  return { user, placeId };
}

export async function GET(request: NextRequest, context: Context) {
  await connection();

  const db = getDb();
  const target = await resolveTarget(db, request, context);
  if (target.failure) return target.failure;

  return Response.json({
    review: findUserReview(db, target.placeId, target.user.id),
  });
}

export async function PUT(request: NextRequest, context: Context) {
  const db = getDb();
  const target = await resolveTarget(db, request, context);
  if (target.failure) return target.failure;

  const body: unknown = await request.json().catch(() => null);
  const parsed = parseReviewInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  return Response.json({
    review: saveReview(db, target.placeId, target.user.id, parsed.input),
  });
}

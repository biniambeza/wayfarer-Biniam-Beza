import { connection, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/connection";
import { getPlaceDetail } from "@/lib/places";
import { parseId } from "@/lib/users";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/places/[id]">,
) {
  // See the note in ../route.ts: seat counts must never come from a build-time copy.
  await connection();

  const { id } = await context.params;
  const placeId = parseId(id);
  const place = placeId === null ? null : getPlaceDetail(getDb(), placeId);

  if (!place) {
    return Response.json({ error: "Place not found" }, { status: 404 });
  }
  return Response.json(place);
}

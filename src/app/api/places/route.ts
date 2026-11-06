import { connection, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/connection";
import {
  isPlaceSort,
  listCategories,
  listPlaces,
  PLACE_SORTS,
} from "@/lib/places";

export async function GET(request: NextRequest) {
  // Next.js can't see synchronous SQLite calls, so this makes sure the handler
  // always runs per request and can't serve data frozen at build time.
  await connection();

  const { searchParams } = request.nextUrl;
  const sort = searchParams.get("sort") ?? "top_rated";
  if (!isPlaceSort(sort)) {
    return Response.json(
      { error: `sort must be one of: ${PLACE_SORTS.join(", ")}` },
      { status: 400 },
    );
  }

  const db = getDb();
  return Response.json({
    places: listPlaces(db, { category: searchParams.get("category"), sort }),
    categories: listCategories(db),
  });
}

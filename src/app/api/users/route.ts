import { connection } from "next/server";
import { getDb } from "@/lib/db/connection";
import { listSelectableUsers } from "@/lib/users";

export async function GET() {
  // See the note in ../places/route.ts: this must not be frozen at build time.
  await connection();

  return Response.json({ users: listSelectableUsers(getDb()) });
}

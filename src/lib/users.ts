import type { Database } from "better-sqlite3";

export interface User {
  id: number;
  name: string;
}

export const USER_ID_HEADER = "x-user-id";

/** Parses an id from a URL or header. Returns null unless it is a positive integer. */
export function parseId(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** The people offered in the "acting as" switcher, not the background reviewers. */
export function listSelectableUsers(db: Database): User[] {
  return db
    .prepare("SELECT id, name FROM users WHERE selectable = 1 ORDER BY id")
    .all() as User[];
}

// There is no login by design, so this trusts whatever id the client sends.
export function getActingUser(db: Database, headers: Headers): User | null {
  const id = parseId(headers.get(USER_ID_HEADER));
  if (id === null) return null;

  const user = db.prepare("SELECT id, name FROM users WHERE id = ?").get(id);
  return (user as User | undefined) ?? null;
}

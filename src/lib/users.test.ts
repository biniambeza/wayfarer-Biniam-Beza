import type { Database } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db/connection";
import { getActingUser, parseId, USER_ID_HEADER } from "./users";

describe("parseId", () => {
  it("accepts a positive integer", () => {
    expect(parseId("42")).toBe(42);
  });

  it.each(["0", "-1", "1.5", "abc", "1e3", " 1", "", null, undefined, "99999999999999999999"])(
    "rejects %j",
    (value) => {
      expect(parseId(value)).toBeNull();
    },
  );
});

describe("getActingUser", () => {
  let db: Database;

  const headersWith = (value: string) => new Headers({ [USER_ID_HEADER]: value });

  beforeEach(() => {
    db = openDatabase(":memory:");
    db.exec("INSERT INTO users (id, name, selectable) VALUES (1, 'Sara', 1)");
  });

  afterEach(() => db.close());

  it("returns the user named by the header", () => {
    expect(getActingUser(db, headersWith("1"))).toEqual({ id: 1, name: "Sara" });
  });

  it("returns null without the header", () => {
    expect(getActingUser(db, new Headers())).toBeNull();
  });

  it("returns null for an unknown or malformed id", () => {
    expect(getActingUser(db, headersWith("999"))).toBeNull();
    expect(getActingUser(db, headersWith("abc"))).toBeNull();
  });
});

"use client";

import { useActingUser } from "./acting-user-provider";

export function UserSwitcher() {
  const { users, currentUser, status, selectUser } = useActingUser();

  if (status === "error") {
    return <p className="text-sm text-red-700">Could not load users</p>;
  }

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      Acting as
      <select
        className="rounded-md border border-stone-300 bg-white px-2 py-1.5 font-medium text-stone-900 disabled:opacity-60"
        disabled={status === "loading" || users.length === 0}
        value={currentUser?.id ?? ""}
        onChange={(event) => selectUser(Number(event.target.value))}
      >
        {status === "loading" && <option value="">Loading…</option>}
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchJson } from "@/lib/client/fetch-json";
import type { User } from "@/lib/users";

const STORAGE_KEY = "wayfarer.actingUserId";

// Storage can throw in private windows or when site data is blocked. The app still
// works without it; the choice just isn't remembered.
function readSavedUserId(): number | null {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveUserId(id: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // See above.
  }
}

interface ActingUserContextValue {
  users: User[];
  currentUser: User | null;
  status: "loading" | "ready" | "error";
  selectUser: (id: number) => void;
}

const ActingUserContext = createContext<ActingUserContextValue | null>(null);

export function ActingUserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [status, setStatus] = useState<ActingUserContextValue["status"]>("loading");

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<{ users: User[] }>("/api/users", { signal: controller.signal })
      .then((data) => {
        const saved = readSavedUserId();
        const savedStillExists = data.users.some((user) => user.id === saved);
        setUsers(data.users);
        setCurrentUserId(savedStillExists ? saved : (data.users[0]?.id ?? null));
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, []);

  const selectUser = useCallback((id: number) => {
    setCurrentUserId(id);
    saveUserId(id);
  }, []);

  const value = useMemo(
    () => ({
      users,
      status,
      selectUser,
      currentUser: users.find((user) => user.id === currentUserId) ?? null,
    }),
    [users, status, selectUser, currentUserId],
  );

  return (
    <ActingUserContext.Provider value={value}>
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser(): ActingUserContextValue {
  const value = useContext(ActingUserContext);
  if (!value) {
    throw new Error("useActingUser must be used inside ActingUserProvider");
  }
  return value;
}

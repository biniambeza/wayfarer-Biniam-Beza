"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "./fetch-json";

interface FetchState<T> {
  requestKey: string;
  data?: T;
  error?: string;
}

/**
 * Loads JSON from the API. While a new request runs it keeps returning the last
 * data, so filters and refreshes do not blank the page. A request whose result is
 * no longer wanted is aborted, so a slow old response can't replace a newer one.
 */
export function useFetch<T>(url: string, userId?: number | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<FetchState<T> | null>(null);
  const requestKey = `${url}|${userId ?? ""}|${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<T>(url, { userId, signal: controller.signal })
      .then((data) => setState({ requestKey, data }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({
          requestKey,
          data: previous?.data,
          error: error.message,
        }));
      });

    return () => controller.abort();
  }, [url, userId, requestKey]);

  const isCurrent = state?.requestKey === requestKey;
  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: state?.data,
    error: isCurrent ? state.error : undefined,
    isLoading: !isCurrent,
    refetch,
  };
}

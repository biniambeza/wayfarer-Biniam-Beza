import { USER_ID_HEADER } from "../users";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface FetchJsonOptions {
  method?: "GET" | "POST" | "PUT";
  userId?: number | null;
  body?: unknown;
  signal?: AbortSignal;
}

/** Calls the API. Any failure throws an ApiError with a message fit to show users. */
export async function fetchJson<T>(
  url: string,
  { method = "GET", userId, body, signal }: FetchJsonOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (userId != null) headers[USER_ID_HEADER] = String(userId);
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new ApiError(
      typeof message === "string"
        ? message
        : "Something went wrong on our side. Please try again.",
      response.status,
    );
  }
  return data as T;
}

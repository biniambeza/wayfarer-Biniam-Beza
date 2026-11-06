/** A random id for one booking attempt, sent again if that attempt is retried. */
export function newAttemptKey(): string {
  // randomUUID only exists on https and localhost, so plain http needs the fallback.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

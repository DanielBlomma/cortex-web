/**
 * Race a promise against a timeout. Used to put a per-query budget on
 * fan-out reads so a single slow database query can't block an entire
 * dashboard endpoint.
 *
 * Returns `{ value, timedOut }`. On timeout the caller decides how to
 * present the missing section (usually empty/zero plus a `degraded` flag
 * on the response).
 *
 * Note: the underlying promise still runs to completion in the background
 * after the timeout; this helper does not cancel work, it only stops
 * waiting for it.
 */
export async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  fallback: T,
): Promise<{ value: T; timedOut: boolean }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<{ value: T; timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ value: fallback, timedOut: true }), ms);
  });
  const race = p.then((value) => {
    if (timeoutId) clearTimeout(timeoutId);
    return { value, timedOut: false as const };
  });
  return Promise.race([race, timer]);
}

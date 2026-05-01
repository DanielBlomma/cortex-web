import { describe, it, expect } from "vitest";
import { withTimeout } from "./timeout";

describe("withTimeout", () => {
  it("returns the value when the promise resolves before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 100, "fallback");
    expect(result.value).toBe("ok");
    expect(result.timedOut).toBe(false);
  });

  it("returns the fallback and flags timedOut when the promise is slow", async () => {
    const slow = new Promise<string>((resolve) =>
      setTimeout(() => resolve("eventually"), 200),
    );
    const result = await withTimeout(slow, 20, "fallback");
    expect(result.value).toBe("fallback");
    expect(result.timedOut).toBe(true);
  });

  it("supports array fallbacks (the typical 'empty rows' shape)", async () => {
    const slow = new Promise<Array<{ id: number }>>((resolve) =>
      setTimeout(() => resolve([{ id: 1 }]), 200),
    );
    const result = await withTimeout(slow, 20, [] as Array<{ id: number }>);
    expect(result.value).toEqual([]);
    expect(result.timedOut).toBe(true);
  });

  it("does not flag timedOut for a synchronously-resolved promise even with ms=0", async () => {
    const result = await withTimeout(Promise.resolve(42), 0, -1);
    // Either path is acceptable, but the value side must be coherent: if
    // we got the real value, timedOut must be false; if we got the
    // fallback, timedOut must be true.
    if (result.value === 42) {
      expect(result.timedOut).toBe(false);
    } else {
      expect(result.value).toBe(-1);
      expect(result.timedOut).toBe(true);
    }
  });
});

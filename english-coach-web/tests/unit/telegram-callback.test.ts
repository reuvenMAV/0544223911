import { describe, expect, it } from "vitest";
import {
  decodeCallbackData,
  encodeCallbackData,
  isOtherChoice,
} from "@/lib/telegram/callback-data";

describe("telegram callback data", () => {
  it("encodes and decodes short callback tokens", () => {
    const token = "a1b2c3d4";
    const encoded = encodeCallbackData(token);
    expect(encoded.length).toBeLessThanOrEqual(64);
    expect(decodeCallbackData(encoded)).toEqual({ ok: true, token });
  });

  it("rejects invalid callback prefixes", () => {
    expect(decodeCallbackData("x:abc")).toEqual({
      ok: false,
      reason: "invalid_prefix",
    });
    expect(decodeCallbackData("")).toEqual({ ok: false, reason: "missing" });
  });

  it("detects other choices", () => {
    expect(isOtherChoice("interest-other")).toBe(true);
    expect(isOtherChoice("movies")).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { readStudioToken, createStudioToken, studioPasswordConfigured, studioPasswordMatches } from "./studioAuth";

const previousPassword = process.env.YAEL_ADMIN_PASSWORD;
const previousJwt = process.env.JWT_SECRET;

afterEach(() => {
  if (previousPassword === undefined) delete process.env.YAEL_ADMIN_PASSWORD;
  else process.env.YAEL_ADMIN_PASSWORD = previousPassword;
  if (previousJwt === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousJwt;
});

describe("Yael studio password login", () => {
  it("rejects a missing or short studio password", () => {
    delete process.env.YAEL_ADMIN_PASSWORD;
    expect(studioPasswordConfigured()).toBe(false);
    expect(studioPasswordMatches("anything-long")).toBe(false);
  });

  it("accepts only the configured studio password", () => {
    process.env.YAEL_ADMIN_PASSWORD = "studio-pass-ok";
    expect(studioPasswordConfigured()).toBe(true);
    expect(studioPasswordMatches("studio-pass-ok")).toBe(true);
    expect(studioPasswordMatches("studio-pass-no")).toBe(false);
  });

  it("round-trips a signed studio session token", () => {
    process.env.JWT_SECRET = "jwt-secret-for-tests";
    const token = createStudioToken();
    expect(readStudioToken(token)).toBe(true);
    expect(readStudioToken(token.slice(0, -2) + "xx")).toBe(false);
    expect(readStudioToken(undefined)).toBe(false);
  });
});

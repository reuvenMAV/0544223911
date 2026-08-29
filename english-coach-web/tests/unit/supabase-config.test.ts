import { describe, expect, it, beforeEach } from "vitest";
import { isSupabaseConfigured } from "@/lib/supabase";

describe("supabase config", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("is disabled without env vars", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is enabled when url and service key exist", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    expect(isSupabaseConfigured()).toBe(true);
  });
});

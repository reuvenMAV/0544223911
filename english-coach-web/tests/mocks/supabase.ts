import { vi } from "vitest";

export function createSupabaseMock() {
  const upsert = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn(() => ({
      upsert,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })),
    __upsert: upsert,
  };
}

export function mockSupabaseConfigured() {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
}

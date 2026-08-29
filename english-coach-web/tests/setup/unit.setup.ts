import { afterEach, vi } from "vitest";
import { __resetProgressStoresForTests } from "@/lib/progress";
import { __resetRateLimitForTests } from "@/lib/rate-limit";

afterEach(() => {
  __resetProgressStoresForTests();
  __resetRateLimitForTests();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

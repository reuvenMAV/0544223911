import { afterEach, vi } from "vitest";
import { __resetProgressStoresForTests } from "@/lib/progress";
import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { __resetTelegramStoresForTests } from "@/lib/telegram/store";
import { __resetTelegramLogsForTests } from "@/lib/telegram/monitoring";

afterEach(() => {
  __resetProgressStoresForTests();
  __resetRateLimitForTests();
  __resetTelegramStoresForTests();
  __resetTelegramLogsForTests();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

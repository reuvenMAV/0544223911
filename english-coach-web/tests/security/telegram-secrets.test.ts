import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const CLIENT_ROOTS = ["src/components", "src/app"];
const FORBIDDEN = [
  "TELEGRAM_BOT_TOKEN",
  "N8N_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "XIAOMI",
  "api.xiaomimimo.com",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

describe("telegram security", () => {
  it("does not expose telegram or server secrets in client bundles", () => {
    const files = CLIENT_ROOTS.flatMap((root) =>
      walk(path.join(process.cwd(), root)),
    );
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        expect(content.includes(token), `${file} contains ${token}`).toBe(false);
      }
    }
  });

  it("does not log telegram bot token in processor/monitoring modules", () => {
    const files = [
      "src/lib/telegram/processor.ts",
      "src/lib/telegram/monitoring.ts",
      "src/app/api/telegram/link-code/route.ts",
    ];
    for (const file of files) {
      const content = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(content).not.toContain("TELEGRAM_BOT_TOKEN");
      expect(content).not.toMatch(/bot\d{6,}:[A-Za-z0-9_-]+/);
    }
  });
});

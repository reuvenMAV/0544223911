import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { sanitizeUserText } from "@/lib/validation";

const CLIENT_ROOTS = ["src/components", "src/app"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

describe("security: secrets and dangerous input", () => {
  it("does not expose server secrets in client source files", () => {
    const forbidden = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "N8N_WEBHOOK_SECRET",
      "XIAOMI",
      "api.xiaomimimo.com",
    ];
    const files = CLIENT_ROOTS.flatMap((root) => walk(path.join(process.cwd(), root)));
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(content.includes(token), `${file} contains ${token}`).toBe(false);
      }
    }
  });

  it("neutralizes script payloads in user text", () => {
    const cleaned = sanitizeUserText('<img src=x onerror="alert(1)">hello');
    expect(cleaned).not.toContain("onerror");
    expect(cleaned).toContain("hello");
  });
});

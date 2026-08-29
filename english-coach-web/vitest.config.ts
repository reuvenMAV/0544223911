import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "tests/unit/**/*.test.ts",
            "tests/api/**/*.test.ts",
            "tests/security/**/*.test.ts",
          ],
          setupFiles: ["tests/setup/unit.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: [
            "tests/component/**/*.test.tsx",
            "tests/accessibility/**/*.test.tsx",
          ],
          setupFiles: ["tests/setup/vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "src/lib/schemas/**/*.ts",
        "src/lib/validation.ts",
        "src/lib/learner-session.ts",
        "src/lib/progress-merge.ts",
        "src/lib/progress.ts",
        "src/lib/rate-limit.ts",
        "src/lib/n8n-client.ts",
        "src/app/api/**/*.ts",
      ],
      thresholds: {
        "src/lib/schemas/coach-api.ts": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "src/lib/learner-session.ts": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "src/lib/validation.ts": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "src/lib/progress-merge.ts": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "src/app/api/chat/route.ts": {
          lines: 80,
          branches: 70,
          functions: 80,
          statements: 80,
        },
        "src/app/api/recap/**/route.ts": {
          lines: 80,
          branches: 70,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
});

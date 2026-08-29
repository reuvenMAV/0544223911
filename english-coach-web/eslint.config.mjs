import { dirname } from "path";
import { fileURLToPath } from "url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    files: ["src/components/ChatShell.tsx"],
    rules: {
      // Cookie/localStorage bootstrap must run once after mount.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;

// Keep dirname referenced for tooling that expects project root resolution.
void __dirname;

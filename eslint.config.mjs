import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "app/**" },
        { type: "view", pattern: "src/view/**" },
        { type: "presentation", pattern: "src/presentation/**" },
        { type: "application", pattern: "src/application/**" },
        { type: "domain", pattern: "src/domain/**" },
        { type: "infrastructure", pattern: "src/infrastructure/**" },
        { type: "di", pattern: "src/di/**" },
        { type: "shared", pattern: "src/shared/**" },
      ],
    },
    rules: {
      "boundaries/element-types": "error",
      "boundaries/no-unknown": "error",
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: { type: "app" },
              allow: { to: { type: ["app", "presentation", "view", "di"] } },
            },
            {
              from: { type: "presentation" },
              allow: {
                to: {
                  type: [
                    "presentation",
                    "di",
                    "view",
                    "application",
                    "domain",
                    "shared",
                  ],
                },
              },
            },
            {
              from: { type: "view" },
              allow: { to: { type: ["view", "presentation", "shared"] } },
            },
            {
              from: { type: "application" },
              allow: { to: { type: ["application", "domain", "shared"] } },
            },
            {
              from: { type: "domain" },
              allow: { to: { type: ["domain", "shared"] } },
            },
            {
              from: { type: "infrastructure" },
              allow: {
                to: {
                  type: ["infrastructure", "application", "domain", "shared"],
                },
              },
            },
            {
              from: { type: "di" },
              allow: { to: { type: ["di", "application", "infrastructure"] } },
            },
            {
              from: { type: "shared" },
              allow: { to: { type: ["shared"] } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: ["src/shared/api/**/*", "src/infrastructure/api/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "openapi-fetch",
              message:
                "Import openapi-fetch only from src/shared/api or src/infrastructure/api.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Call fetch only from src/shared/api or src/infrastructure/api.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

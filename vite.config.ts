import { defineConfig } from "vite-plus";
import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { msw } from "msw/vite";
import arraybuffer from "vite-plugin-arraybuffer";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
  test: {
    projects: [
      {
        test: {
          include: ["tests/node/*.spec.ts"],
          name: "node",
        },
      },
      {
        test: {
          include: ["tests/browser/*.spec.ts"],
          name: "browser",
          api: true,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
        plugins: [msw(), arraybuffer()],
      },
    ],
  },
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },
    dts: {
      generator: "tsgo",
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "typescript/no-useless-default-assignment": "off",
    },
  },
  fmt: {},
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "jittered-fractional-indexing",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["fractional-indexing"], // add deps to exclude here
    },
  },
  test: {
    environment: "node",
  },
});

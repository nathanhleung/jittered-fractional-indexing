import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: "src/index.ts",
      name: "jittered-fractional-indexing",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["fractional-indexing"], // add deps to exclude here
    },
  },
  plugins: [dts({ rollupTypes: true })],
  test: {
    environment: "node",
  },
});

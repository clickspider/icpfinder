import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/hunter.ts",
    "src/gemini.ts",
    "src/fake.ts",
    "src/types.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: "node20",
  external: ["p-limit"],
});

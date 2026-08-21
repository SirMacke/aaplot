import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "bin/aaplot": "src/bin/aaplot.tsx",
  },
  format: ["esm"],
  target: "node20",
  platform: "node",
  sourcemap: true,
  clean: true,
  external: ["react", "react-devtools-core"],
});

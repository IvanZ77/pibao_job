import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 屁宝专属 IBD Compass — Vite + React build
//
// base: "./" makes all built asset references relative, so the site works when
// served from a GitHub Pages project subpath (e.g. /pibao_job/) as well as from
// a domain root or local preview — no need to hardcode the repo name.
export default defineConfig({
  base: "./",
  plugins: [react()],
});

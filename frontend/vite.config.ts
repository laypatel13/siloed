import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// This replaces the previous @lovable.dev/vite-tanstack-config wrapper with
// its underlying plugins directly, so the project no longer depends on the
// Lovable platform package to build. Deploy target is Vercel (see
// README/CLAUDE.md roadmap) — Nitro auto-applies its "vercel" preset on a
// Vercel build. `src/server.ts` was a Cloudflare Worker fetch-handler entry
// point and is unused with this target; safe to delete, left in place for
// now since it doesn't affect the Vercel build.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      target: "vercel",
    }),
    viteReact(),
  ],
});

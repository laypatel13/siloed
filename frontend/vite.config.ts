import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// This replaces the previous @lovable.dev/vite-tanstack-config wrapper with
// its underlying plugins directly, so the project no longer depends on the
// Lovable platform package to build. Deploy target is Vercel (see
// README/CLAUDE.md roadmap). On this TanStack Start version, the old
// `tanstackStart({ target: 'vercel' })` string option is not enough on its
// own -- it built "successfully" but produced a 404 on every route because
// no SSR function was actually emitted. The explicit Nitro Vite plugin is
// what TanStack/Vercel's current docs call for: Nitro auto-detects the
// Vercel preset from Vercel's build environment, no target/preset needed.
// `src/server.ts` was a Cloudflare Worker fetch-handler entry point and is
// unused here; safe to delete, left in place since it doesn't affect the
// Vercel build.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
});
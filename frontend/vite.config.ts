import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// This replaces the previous @lovable.dev/vite-tanstack-config wrapper with
// its underlying plugins directly, so the project no longer depends on the
// Lovable platform package to build. Verify with `npm install && npm run
// build` — the `target` option below (used for the Cloudflare Workers/nitro
// output referenced by src/server.ts) may need adjusting to match wherever
// you actually deploy; drop it if you don't deploy to Cloudflare.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      target: "cloudflare-module",
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});

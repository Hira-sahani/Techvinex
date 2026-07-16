import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "node:child_process";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";


// Regenerates src/generated/release.ts + supabase/functions/_shared/release.ts
// on every dev start / build so frontend bundle and edge functions share the
// SAME Sentry release identifier (commit SHA when git is available).
function releasePlugin(): Plugin {
  return {
    name: "techvinex-release",
    enforce: "pre",
    buildStart() {
      try {
        execSync("node ./scripts/generate-release.mjs", {
          stdio: "inherit",
          env: { ...process.env, GENERATE_RELEASE_VERBOSE: "1" },
        });
      } catch (err) {
        // Build must not fail just because the release file couldn't be
        // regenerated — the previously cached file is still valid.
        // eslint-disable-next-line no-console
        console.warn("[release] generation skipped:", (err as Error).message);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [releasePlugin(), mcpPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    // Generate sourcemaps in production so Sentry can symbolicate stack
    // traces. They are kept alongside the JS chunks; if a future build step
    // wants to upload+strip them via @sentry/vite-plugin, the maps are ready.
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-toast",
            "@radix-ui/react-tabs",
          ],
          "supabase": ["@supabase/supabase-js"],
          "query": ["@tanstack/react-query"],
          "charts": ["recharts"],
          "editor": ["@tiptap/react", "@tiptap/starter-kit"],
          "sanitize": ["dompurify"],
        },
      },
    },
  },
}));

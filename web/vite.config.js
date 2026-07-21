import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nimChatDevPlugin } from "./vite-plugin-nim-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  // Merge env from monorepo root + web/ + process.env (Vercel injects here)
  const merged = {
    ...loadEnv(mode, repoRoot, ""),
    ...loadEnv(mode, __dirname, ""),
  };
  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith("VITE_") && v && !process.env[k]) {
      process.env[k] = v;
    }
  }

  const url = (process.env.VITE_SUPABASE_URL || "").trim();
  const key = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    console.warn(
      "\n[piedra] Build-time env incomplete:\n" +
        `  VITE_SUPABASE_URL = ${url ? "set" : "MISSING"}\n` +
        `  VITE_SUPABASE_PUBLISHABLE_KEY = ${
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "set" : "MISSING"
        }\n` +
        `  VITE_SUPABASE_ANON_KEY (legacy) = ${
          process.env.VITE_SUPABASE_ANON_KEY ? "set" : "MISSING"
        }\n` +
        "On Vercel: Settings → Environment Variables → Production → Redeploy.\n"
    );
  } else {
    console.log(
      `[piedra] Supabase env OK at build (url host: ${(() => {
        try {
          return new URL(url).host;
        } catch {
          return "?";
        }
      })()})`
    );
  }

  return {
    plugins: [react(), tailwindcss(), nimChatDevPlugin()],
    envDir: __dirname,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      // Las peticiones NIM pueden tardar minutos en modelos grandes
      proxy: undefined,
    },
    build: {
      outDir: path.resolve(__dirname, "../dist"),
      emptyOutDir: true,
    },
  };
});

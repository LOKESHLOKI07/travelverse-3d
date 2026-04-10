import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";

const ii_url =
  process.env.DFX_NETWORK === "local"
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081/`
    : `https://identity.internetcomputer.org/`;

process.env.II_URL = process.env.II_URL || ii_url;
process.env.STORAGE_GATEWAY_URL = process.env.STORAGE_GATEWAY_URL || "";

export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5007,
    host: true,
    proxy: {
      // Must be before "/api": Vite matches with path.startsWith(context), so "/api-node"
      // would incorrectly hit the "/api" rule and go to the replica (4943) instead of Node (4944).
      "/api-node": {
        target: "http://127.0.0.1:4944",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-node/, "") || "/",
        configure(proxy) {
          proxy.on("error", (err, _req, res) => {
            if (!res || res.writableEnded) return;
            const msg =
              "Node API unreachable (start tourist-node-api on port 4944, e.g. pnpm dev:api from repo root).";
            if (typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `${msg} ${String(err?.code || err?.message || "")}` }));
            }
          });
        },
      },
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment(["II_URL"]),
    environment(["STORAGE_GATEWAY_URL"]),
    environment(["VITE_USE_NODE_BACKEND"]),
    environment(["VITE_NODE_API_BASE_URL"]),
    environment(["VITE_APP_ADMIN_TOKEN"]),
    react(),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(new URL("../declarations", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ["@dfinity/agent"],
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig, type ProxyOptions } from "vite";

const api = `http://localhost:${process.env.PORT || 4000}`;

/** Forwards to the API, and says so plainly when the API isn't running instead of failing silently. */
const toApi: ProxyOptions = {
  target: api,
  configure(proxy) {
    proxy.on("error", (_err, _req, res) => {
      if (!("writeHead" in res) || res.headersSent) return;
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `NinRe's API isn't running on ${api}. Start everything with "npm run dev" from the project folder.` }));
    });
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": toApi, "/uploads": toApi },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});

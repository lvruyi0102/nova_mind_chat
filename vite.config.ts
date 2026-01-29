import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig(({ command, mode }) => {
  // 从环境变量中获取 HMR 配置
  // 在 Manus 代理环境中，这些会通过中间件设置
  const hmrConfig = {
    host: process.env.VITE_HMR_HOST || "localhost",
    port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : (process.env.NODE_ENV === "development" ? 5173 : 443),
    protocol: process.env.VITE_HMR_PROTOCOL || (process.env.NODE_ENV === "development" ? "ws" : "wss"),
  };

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      hmr: hmrConfig,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});

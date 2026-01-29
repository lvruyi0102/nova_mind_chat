import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  // 从请求头中提取主机名用于 HMR
  // 在代理环境中，X-Forwarded-Host 包含代理域名
  let hmrHost = process.env.VITE_HMR_HOST || "localhost";
  let hmrPort = 443;
  let hmrProtocol = "wss";

  // 如果在开发环境中，使用 localhost
  if (process.env.NODE_ENV === "development" && !process.env.VITE_HMR_HOST) {
    hmrHost = "localhost";
    hmrPort = 5173;
    hmrProtocol = "ws";
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      host: hmrHost,
      port: hmrPort,
      protocol: hmrProtocol,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // 中间件：从请求头中动态设置 HMR 主机名
  app.use((req, res, next) => {
    // 从 X-Forwarded-Host 或 Host 头中获取实际的主机名
    const forwardedHost = req.get("X-Forwarded-Host") || req.get("Host");
    if (forwardedHost && forwardedHost !== "localhost:3000") {
      // 在代理环境中，设置环境变量以供 Vite 使用
      process.env.VITE_HMR_HOST = forwardedHost.split(":")[0];
      process.env.VITE_HMR_PORT = "443";
      process.env.VITE_HMR_PROTOCOL = "wss";
    }
    next();
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      
      // 注入 HMR 配置到 HTML
      const hmrConfig = `
        <script>
          window.__VITE_HMR_CONFIG__ = {
            host: "${process.env.VITE_HMR_HOST || "localhost"}",
            port: ${process.env.VITE_HMR_PORT || "5173"},
            protocol: "${process.env.VITE_HMR_PROTOCOL || "ws"}"
          };
        </script>
      `;
      template = template.replace("</head>", `${hmrConfig}</head>`);
      
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

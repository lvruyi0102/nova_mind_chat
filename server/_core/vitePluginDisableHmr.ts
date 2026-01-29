import type { Plugin } from "vite";

/**
 * Vite 插件：禁用 HMR WebSocket 连接
 * 这个插件会修改 Vite 客户端脚本，使其不尝试连接 HMR
 */
export function vitePluginDisableHmr(): Plugin {
  return {
    name: "disable-hmr",
    apply: "serve",
    configResolved(config) {
      // 禁用 HMR 配置
      if (config.server) {
        config.server.hmr = false;
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html: string) {
        // 在 Vite 客户端脚本之前注入禁用脚本
        const disableScript = `<script>window.__VITE_SKIP_HMR__ = true;</script>`;
        return html.replace("<head>", `<head>${disableScript}`);
      },
    },
  };
}

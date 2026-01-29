// 禁用 Vite HMR WebSocket 连接
// 这个脚本在 index.html 中尽早加载，防止 Vite 客户端尝试连接到 WebSocket
if (typeof window !== 'undefined') {
  // 设置一个标记，告诉 Vite 不要尝试连接 HMR
  window.__VITE_SKIP_HMR__ = true;
  
  // 如果 Vite 已经加载，禁用 HMR 连接
  if (window.__VITE_HMR_CONFIG__) {
    window.__VITE_HMR_CONFIG__.host = null;
    window.__VITE_HMR_CONFIG__.port = null;
  }
}

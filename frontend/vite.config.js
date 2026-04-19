import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // 루트 D:/deping/.env 를 참조 (VITE_ 접두사 변수 자동 로드)
  envDir: path.resolve(__dirname, ".."),

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',  // localhost → 127.0.0.1 (IPv6 오해 방지)
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    proxy: {
      // Конфигурация прокси
      '/ws': {
        target: 'http://localhost:8088', // Замените на URL вашего сервера
        changeOrigin: false,
        secure: false,
        ws: true, // Важно для WebSocket
      },
      // Вы можете добавить другие маршруты прокси здесь
    }
  }
});

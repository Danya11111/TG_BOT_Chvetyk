import type { Plugin } from 'vite';
import type { Connect } from 'vite';

/**
 * Плагин для отключения проверки хоста в Vite для работы с ngrok
 * В Vite 7+ проверка хоста происходит через внутреннюю логику сервера
 */
export function viteNgrokPlugin(): Plugin {
  return {
    name: 'vite-ngrok-plugin',
    configureServer(server) {
      // В Vite 7+ проверка хоста происходит через метод checkOrigin
      // Переопределяем его для пропуска всех хостов
      
      // Сохраняем оригинальный метод, если есть
      const originalCheckOrigin = (server as any).checkOrigin;
      
      // Переопределяем checkOrigin для пропуска всех хостов
      (server as any).checkOrigin = (origin: string, host: string) => {
        // Пропускаем все хосты, включая ngrok
        console.log(`[vite-ngrok-plugin] Allowing host: ${host || origin}`);
        return true;
      };
      
      // Также переопределяем через httpServer, если доступен
      const httpServer = (server as any).httpServer;
      if (httpServer) {
        // Перехватываем запросы до проверки хоста
        const originalListeners = httpServer.listeners('request') || [];
        
        // Добавляем обработчик для пропуска проверки
        httpServer.on('request', (req: any, res: any, next?: any) => {
          // Устанавливаем флаг для пропуска проверки
          if (req.headers && req.headers.host) {
            // Разрешаем все хосты
            (req as any).__vite_skip_host_check = true;
          }
          if (next) next();
        });
      }
      
      // Добавляем middleware для пропуска всех запросов
      server.middlewares.use((req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
        // Пропускаем все запросы
        next();
      });
    },
  };
}

// Дополнительная конфигурация для отключения проверки хоста
// Этот файл используется для настройки сервера разработки

import type { Connect } from 'vite';

export function configureServer(server: any) {
  // Отключаем проверку хоста для работы с ngrok
  const originalCheck = server.config.server?.host;
  
  // Переопределяем middleware для пропуска всех хостов
  const originalUse = server.middlewares.use.bind(server.middlewares);
  
  server.middlewares.use((req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
    // Пропускаем все запросы без проверки хоста
    next();
  });
}

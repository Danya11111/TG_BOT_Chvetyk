// Конфигурация API клиента
// В проде и в Telegram WebApp используем origin, в dev - Vite proxy или VITE_API_URL
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const { protocol, origin, host, hostname } = window.location;
    const isTelegramHost = /(^|\.)t\.me$|telegram\.org$|web\.telegram\.org$/.test(hostname);
    if (isTelegramHost) {
      return envUrl || 'https://bot-flowers-studio-ru.ru';
    }
    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
    if (host) {
      return `https://${host}`;
    }
  }
  return envUrl || 'https://bot-flowers-studio-ru.ru';
};

const API_URL = getApiUrl();

export const apiConfig = {
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Экспорт для использования в axios или fetch
export default apiConfig;

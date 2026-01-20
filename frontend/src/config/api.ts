// Конфигурация API клиента
// В проде и в Telegram WebApp используем origin, в dev - Vite proxy или VITE_API_URL
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    const { protocol, origin, host } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
    if (host) {
      return `https://${host}`;
    }
  }
  return '';
};

const API_URL = getApiUrl();

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Экспорт для использования в axios или fetch
export default apiConfig;

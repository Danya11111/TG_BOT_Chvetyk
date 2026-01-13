// Конфигурация API клиента
// Для ngrok: используем относительный путь, Vite proxy обработает запрос
// Vite proxy перенаправляет /api на backend:3000
const getApiUrl = () => {
  // Если открыто через HTTPS (ngrok), используем относительный путь (Vite proxy)
  if (window.location.protocol === 'https:') {
    return ''; // Относительный путь - Vite proxy обработает
  }
  // Для localhost используем прямой URL к API
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
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

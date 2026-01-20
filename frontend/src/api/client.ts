import axios, { AxiosInstance, AxiosError, AxiosHeaders } from 'axios';
import apiConfig from '../config/api';
import { getTelegramInitData } from '../utils/initData';

// Создание экземпляра axios
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL || '', // Если пусто, используем относительный путь
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

// Интерцептор запросов
apiClient.interceptors.request.use(
  (config) => {
    const initData = getTelegramInitData();
    if (initData) {
      const headers = config.headers ? new AxiosHeaders(config.headers) : new AxiosHeaders();
      headers.set('X-Telegram-Init-Data', initData);
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out'));
    }
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        return Promise.reject(new Error('Unauthorized'));
      }
      return Promise.reject(error);
    }
    if (error.request) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

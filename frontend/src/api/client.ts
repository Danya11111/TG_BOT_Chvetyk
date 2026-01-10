import axios, { AxiosInstance, AxiosError } from 'axios';
import apiConfig from '../config/api';

// Создание экземпляра axios
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

// Интерцептор запросов
apiClient.interceptors.request.use(
  (config) => {
    // Можно добавить токен авторизации, если нужен
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор ответов
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Обработка ошибок
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

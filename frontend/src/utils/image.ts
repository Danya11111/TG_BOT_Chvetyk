import apiConfig from '../config/api';

const getBaseUrl = () => {
  if (apiConfig.baseURL) {
    return apiConfig.baseURL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

export const resolveImageUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  const base = getBaseUrl();
  if (!base) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
};

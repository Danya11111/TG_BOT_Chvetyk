import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

import CatalogPage from './pages/Catalog';
import ProductPage from './pages/Product';
import CartPage from './pages/Cart';
import CheckoutPage from './pages/Checkout';
import AboutPage from './pages/About';
import ProfilePage from './pages/Profile';

import './styles/index.css';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.enableClosingConfirmation();
      
      // Устанавливаем цвета приложения из темы
      const getThemeColor = (varName: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
      const bgColor = getThemeColor('--bg-main', '#FFFFFF');
      WebApp.setHeaderColor(bgColor);
      WebApp.setBackgroundColor(bgColor);
      
      // Предотвращаем перезагрузку страницы при навигации
      // Используем onEvent для отслеживания изменений viewport
      WebApp.onEvent('viewportChanged', (event) => {
        console.log('Viewport changed:', event);
      });
      
      // Отключаем автоматическую перезагрузку при изменении состояния
      if (WebApp.BackButton) {
        WebApp.BackButton.onClick(() => {
          // Обработка кнопки назад будет через React Router
          window.history.back();
        });
      }
      
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
      setIsReady(true); // Продолжаем работу даже если WebApp недоступен
    }
  }, []);

  if (!isReady) {
    return <div>Загрузка...</div>;
  }

  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

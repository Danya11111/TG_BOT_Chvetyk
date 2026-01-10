import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Настройка кнопки в Telegram
    if (WebApp.initDataUnsafe?.user) {
      WebApp.MainButton.setText('Открыть каталог');
      WebApp.MainButton.show();
      WebApp.MainButton.onClick(() => {
        navigate('/catalog');
      });
    }
  }, [navigate]);

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>🌺 Добро пожаловать!</h1>
      <p style={{ marginBottom: '20px', textAlign: 'center', color: '#6C757D' }}>
        Магазин цветов - заказ цветов через Telegram
      </p>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        marginTop: '40px'
      }}>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/catalog')}
          style={{ width: '100%' }}
        >
          🌺 Открыть каталог
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/cart')}
          style={{ width: '100%' }}
        >
          🛒 Корзина
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/about')}
          style={{ width: '100%' }}
        >
          ℹ️ О нас
        </button>
      </div>

      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#F8F9FA',
        borderRadius: '12px'
      }}>
        <p style={{ fontSize: '14px', color: '#6C757D', textAlign: 'center' }}>
          Каталог товаров будет доступен после интеграции с системой учёта Posiflora.
        </p>
      </div>
    </div>
  );
}

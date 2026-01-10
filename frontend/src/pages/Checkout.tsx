import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function CheckoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>📦 Оформление заказа</h1>
      
      <div style={{ 
        padding: '40px 20px',
        textAlign: 'center',
        color: '#6C757D'
      }}>
        <p style={{ marginBottom: '16px', fontSize: '18px' }}>
          Оформление заказа
        </p>
        <p style={{ fontSize: '14px', marginBottom: '24px' }}>
          Форма оформления заказа будет доступна после интеграции с системой учёта Posiflora.
        </p>
        
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/catalog')}
        >
          Вернуться в каталог
        </button>
      </div>
    </div>
  );
}

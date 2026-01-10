import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Загрузка корзины из API
    setItems([]);
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      WebApp.MainButton.setText(`Оформить заказ (${items.length})`);
      WebApp.MainButton.show();
      WebApp.MainButton.onClick(() => {
        navigate('/checkout');
      });
    } else {
      WebApp.MainButton.hide();
    }
  }, [items, navigate]);

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>🛒 Корзина</h1>
      
      {items.length === 0 ? (
        <div style={{ 
          padding: '40px 20px',
          textAlign: 'center',
          color: '#6C757D'
        }}>
          <p style={{ marginBottom: '16px', fontSize: '18px' }}>
            Корзина пуста
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/catalog')}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <div>
          {/* Список товаров в корзине */}
          <p style={{ color: '#6C757D', fontSize: '14px' }}>
            Функция корзины будет реализована после интеграции с Posiflora.
          </p>
        </div>
      )}
    </div>
  );
}

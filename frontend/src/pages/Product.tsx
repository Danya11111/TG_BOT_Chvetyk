import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Загрузка товара из API после интеграции с Posiflora
    setLoading(false);
  }, [id]);

  useEffect(() => {
    WebApp.MainButton.setText('Добавить в корзину');
    WebApp.MainButton.show();
    WebApp.MainButton.onClick(() => {
      // TODO: Добавление в корзину
      WebApp.showAlert('Товар добавлен в корзину!');
    });
    
    return () => {
      WebApp.MainButton.hide();
    };
  }, []);

  if (loading) {
    return <div className="loading">Загрузка товара...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '20px',
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer'
        }}
      >
        ← Назад
      </button>
      
      <div style={{ textAlign: 'center', color: '#6C757D' }}>
        <p style={{ marginBottom: '16px', fontSize: '18px' }}>
          Страница товара
        </p>
        <p style={{ fontSize: '14px' }}>
          Детальная информация о товаре будет доступна после интеграции с Posiflora.
        </p>
      </div>
    </div>
  );
}

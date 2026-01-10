import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

export default function AboutPage() {
  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>ℹ️ О нас</h1>
      
      <div style={{ 
        padding: '20px',
        backgroundColor: '#F8F9FA',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          Информация о компании будет добавлена позже.
        </p>
        <p style={{ color: '#6C757D', fontSize: '14px' }}>
          Вы можете связаться с нами для получения дополнительной информации.
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Контакты</h2>
        <p style={{ color: '#6C757D', fontSize: '14px' }}>
          Контактная информация будет добавлена позже.
        </p>
      </div>
    </div>
  );
}

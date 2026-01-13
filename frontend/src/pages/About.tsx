import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFFFF',
      paddingBottom: '60px'
    }}>
      {/* Заголовок с кнопкой назад */}
      <div style={{
        backgroundColor: '#FFCADC',
        padding: '12px 16px',
        color: '#2D1B2E',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            navigate('/catalog', { replace: false });
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#2D1B2E"
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{ fontSize: '16px', fontWeight: 'bold', flex: 1 }}>
          О нас
        </div>
      </div>

      <div className="container" style={{ paddingTop: '20px' }}>
      
      <div style={{ 
        padding: '20px',
        backgroundColor: '#F8F9FA',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          Информация о компании будет добавлена позже.
        </p>
        <p style={{ color: '#495057', fontSize: '14px' }}>
          Вы можете связаться с нами для получения дополнительной информации.
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Контакты</h2>
        <p style={{ color: '#495057', fontSize: '14px' }}>
          Контактная информация будет добавлена позже.
        </p>
      </div>
      </div>

      {/* Нижняя навигация */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFCADC',
        padding: '8px 0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div 
          onClick={(e) => {
            e.preventDefault();
            navigate('/catalog', { replace: false });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: '#2D1B2E'
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#2D1B2E"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
          </svg>
          <span style={{ fontSize: '10px' }}>Каталог</span>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            navigate('/cart', { replace: false });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: '#2D1B2E'
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#2D1B2E"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span style={{ fontSize: '10px' }}>Корзина</span>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            navigate('/profile', { replace: false });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: '#2D1B2E'
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#2D1B2E"
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="5"></circle>
            <path d="M3 21c0-5 4-9 9-9s9 4 9 9"></path>
          </svg>
          <span style={{ fontSize: '10px' }}>Профиль</span>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            navigate('/about', { replace: false });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: '#2D1B2E'
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#2D1B2E"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span style={{ fontSize: '10px' }}>О нас</span>
        </div>
      </div>
    </div>
  );
}

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
        <h2 style={{ margin: '0 0 12px', fontSize: '18px', color: '#2D1B2E' }}>
          Говорящие цветы
        </h2>
        <p style={{ marginBottom: '10px', lineHeight: '1.6', color: '#495057' }}>
          Цветочный сервис в Чебоксарах. Собираем букеты с 09:00 до 21:00 и доставляем в течение 1–2 часов по городу и ближайшим районам.
        </p>
        <p style={{ margin: 0, color: '#2D1B2E', fontWeight: 500 }}>
          Оформляйте заказы в боте FlowersStudioBot — отвечаем быстро.
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Контакты</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#2D1B2E', fontSize: '14px' }}>
          <div><strong>Телефон:</strong> <a href="tel:+79603068713" style={{ color: '#2D1B2E' }}>8-960-306-87-13</a></div>
          <div><strong>Email:</strong> <a href="mailto:flowers-cheb2014@yandex.ru" style={{ color: '#2D1B2E' }}>flowers-cheb2014@yandex.ru</a></div>
          <div><strong>Адрес:</strong> г. Чебоксары, ул. Университетская, 38/3</div>
          <div><strong>График:</strong> ежедневно 09:00–21:00</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>Социальные сети:</span>
            <a href="https://t.me/flowerscheb" target="_blank" rel="noreferrer" style={{ color: '#495057' }}>Telegram: @flowerscheb</a>
            <a href="https://www.instagram.com/tf_flowers_21" target="_blank" rel="noreferrer" style={{ color: '#495057' }}>Instagram: @tf_flowers_21</a>
            <a href="https://vk.com/torgflowers" target="_blank" rel="noreferrer" style={{ color: '#495057' }}>VK: vk.com/torgflowers</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>Ссылки:</span>
            <a href="https://cvety-cheboksary.ru" target="_blank" rel="noreferrer" style={{ color: '#495057' }}>Официальный сайт</a>
            <a href="https://yandex.ru/profile/47796378484?lang=ru" target="_blank" rel="noreferrer" style={{ color: '#495057' }}>Яндекс.Карты</a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Доставка</h2>
        <div style={{ backgroundColor: '#FFF0F5', borderRadius: '12px', padding: '16px', border: '1px solid #FFCADC' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, color: '#2D1B2E' }}>Стоимость по зонам (09:00–21:00):</div>
          <ul style={{ margin: '0 0 12px 16px', padding: 0, color: '#2D1B2E', lineHeight: 1.5 }}>
            <li>Чебоксары — бесплатно</li>
            <li>Новый город — 300 ₽</li>
            <li>Новочебоксарск — 400 ₽</li>
            <li>Кугеси — 400 ₽</li>
            <li>Лапсары — 400 ₽</li>
            <li>Другие районы — по договоренности с менеджером</li>
          </ul>
          <div style={{ color: '#495057', fontSize: '14px' }}>
            • Доставляем с 09:00 до 21:00 (после 21:00 +500 ₽, согласовываем заранее).<br/>
            • Среднее время доставки: 1–2 часа.<br/>
            • Заказы на ночь оформляйте с 09:00 до 21:00.<br/>
            • Минимальной суммы заказа нет.
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Самовывоз</h2>
        <div style={{ backgroundColor: '#F8F9FA', borderRadius: '12px', padding: '16px', border: '1px solid #E0E0E0', color: '#2D1B2E' }}>
          <div style={{ marginBottom: '8px' }}><strong>Адрес:</strong> ул. Университетская, 38 к. 3, Чебоксары, 428034</div>
          <div style={{ marginBottom: '8px' }}><strong>Время работы точки:</strong> 09:00–21:00</div>
          <div style={{ color: '#495057', fontSize: '14px' }}>
            Подробные инструкции по самовывозу уточняются — менеджер напишет после оформления заказа.
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Бонусы и оплата</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: '#FFF0F5', borderRadius: '12px', padding: '14px', border: '1px solid #FFCADC', color: '#2D1B2E' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Бонусная программа</div>
            <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#2D1B2E', lineHeight: 1.5 }}>
              <li>Начисляем 5% от суммы заказа.</li>
              <li>Начисление не распространяется на оплату доставки.</li>
              <li>Списание до 10% от суммы заказа (не действует на акции).</li>
              <li>Списывать можно только на товары, доставку бонусами не оплачиваем.</li>
              <li>Минимальной суммы для начисления/списания нет.</li>
              <li>Округляем начисление вверх до целого рубля.</li>
            </ul>
          </div>
          <div style={{ backgroundColor: '#F8F9FA', borderRadius: '12px', padding: '14px', border: '1px solid #E0E0E0', color: '#2D1B2E' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Способы оплаты</div>
            <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#2D1B2E', lineHeight: 1.5 }}>
              <li>Наличные при получении.</li>
              <li>Токен от ВТБ (онлайн-оплата по токену).</li>
            </ul>
          </div>
        </div>
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

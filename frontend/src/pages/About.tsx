import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCustomerConfig } from '../hooks/useCustomerConfig';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';

export default function AboutPage() {
  const navigate = useNavigate();
  const { config } = useCustomerConfig();

  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-main)',
      paddingBottom: '120px'
    }}>
      {/* Заголовок с кнопкой назад */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 16px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
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
            stroke="currentColor"
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
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '18px', color: '#2D1B2E' }}>
          {config?.brand?.displayName || 'Говорящие цветы'}
        </h2>
        <p style={{ marginBottom: '10px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          Цветочный сервис в {config?.delivery?.city || 'Чебоксарах'}. Собираем букеты с {config?.delivery?.workingHours || '09:00–21:00'} и доставляем в течение {config?.delivery?.avgTime || '1–2 часов'} по городу и ближайшим районам.
        </p>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
          Оформляйте заказы в боте {config?.brand?.botName || 'FlowersStudioBot'} — отвечаем быстро.
        </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Контакты</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
          <div><strong>Телефон:</strong> <a href={`tel:${config?.contacts?.phone || '+79603068713'}`} style={{ color: 'var(--text-primary)' }}>{config?.contacts?.phone || '8-960-306-87-13'}</a></div>
          <div><strong>Email:</strong> <a href={`mailto:${config?.contacts?.email || 'flowers-cheb2014@yandex.ru'}`} style={{ color: 'var(--text-primary)' }}>{config?.contacts?.email || 'flowers-cheb2014@yandex.ru'}</a></div>
          <div><strong>Адрес:</strong> {config?.contacts?.address || 'г. Чебоксары, ул. Университетская, 38/3'}</div>
          <div><strong>График:</strong> {config?.contacts?.workHours || 'ежедневно 09:00–21:00'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>Социальные сети:</span>
            {config?.contacts?.social?.telegram && (
              <a href={config.contacts.social.telegram} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>Telegram</a>
            )}
            {config?.contacts?.social?.instagram && (
              <a href={config.contacts.social.instagram} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>Instagram</a>
            )}
            {config?.contacts?.social?.vk && (
              <a href={config.contacts.social.vk} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>VK</a>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>Ссылки:</span>
            {config?.contacts?.links?.site && (
              <a href={config.contacts.links.site} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>Официальный сайт</a>
            )}
            {config?.contacts?.links?.yandexMaps && (
              <a href={config.contacts.links.yandexMaps} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>Яндекс.Карты</a>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Доставка</h2>
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(201, 163, 58, 0.3)' }}>
          <div style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Стоимость по зонам ({config?.delivery?.workingHours || '09:00–21:00'}):
          </div>
          <ul style={{ margin: '0 0 12px 16px', padding: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {(config?.delivery?.zones || [
              { name: 'Чебоксары', price: 'бесплатно' },
              { name: 'Новый город', price: '300 ₽' },
              { name: 'Новочебоксарск', price: '400 ₽' },
              { name: 'Кугеси', price: '400 ₽' },
              { name: 'Лапсары', price: '400 ₽' },
              { name: 'Другие районы', price: 'по договоренности с менеджером' },
            ]).map((zone) => (
              <li key={`${zone.name}-${zone.price}`}>{zone.name} — {zone.price}</li>
            ))}
          </ul>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            • Доставляем с {config?.delivery?.workingHours || '09:00–21:00'} (после {config?.delivery?.afterHoursStart || '21:00'} +{config?.delivery?.afterHoursFee || '500 ₽'}, согласовываем заранее).<br/>
            • Среднее время доставки: {config?.delivery?.avgTime || '1–2 часа'}.<br/>
            {(config?.delivery?.notes || ['Заказы на ночь оформляйте с 09:00 до 21:00.', 'Минимальной суммы заказа нет.']).map((note) => (
              <span key={note}>• {note}<br/></span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Самовывоз</h2>
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text-primary)' }}>
          <div style={{ marginBottom: '8px' }}><strong>Адрес:</strong> {config?.pickup?.address || 'ул. Университетская, 38 к. 3, Чебоксары, 428034'}</div>
          <div style={{ marginBottom: '8px' }}><strong>Время работы точки:</strong> {config?.pickup?.hours || '09:00–21:00'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {config?.pickup?.note || 'Подробные инструкции по самовывозу уточняются — менеджер напишет после оформления заказа.'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D1B2E' }}>Бонусы и оплата</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(201, 163, 58, 0.3)', color: 'var(--text-primary)' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>{config?.bonuses?.title || 'Бонусная программа'}</div>
            <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#2D1B2E', lineHeight: 1.5 }}>
              {(config?.bonuses?.rules || [
                'Начисляем 5% от суммы заказа.',
                'Начисление не распространяется на оплату доставки.',
                'Списание до 10% от суммы заказа (не действует на акции).',
                'Списывать можно только на товары, доставку бонусами не оплачиваем.',
                'Минимальной суммы для начисления/списания нет.',
                'Округляем начисление вверх до целого рубля.',
              ]).map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text-primary)' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>{config?.payments?.title || 'Способы оплаты'}</div>
            <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#2D1B2E', lineHeight: 1.5 }}>
              {(config?.payments?.methods || [
                'Наличные при получении.',
                'Оплата по реквизитам карты.',
              ]).map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </div>

      <AppFooter />
      <BottomNavigation />
    </div>
  );
}

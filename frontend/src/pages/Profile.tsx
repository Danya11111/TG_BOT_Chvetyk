import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useProfileStore } from '../store/profile.store';

type TabType = 'addresses' | 'orders' | 'support';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [address, setAddress] = useState('');
  
  const cartTotal = useCartStore((state) => state.getTotal());
  const cartItemsCount = useCartStore((state) => state.getItemCount());
  const { addresses, addAddress } = useProfileStore();

  // Получаем данные пользователя из Telegram
  const user = WebApp.initDataUnsafe?.user;
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';
  const username = user?.username ? `@${user.username}` : '';
  const photoUrl = user?.photo_url || '';

  // Формируем полное имя
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Пользователь';

  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  const handleSaveAddress = () => {
    if (address.trim()) {
      addAddress(address.trim());
      setAddress('');
      WebApp.showAlert('Адрес сохранен!');
    }
  };


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
          Профиль
        </div>
      </div>

      {/* Основной контент */}
      <div style={{ padding: '16px' }}>
        {/* Профиль пользователя */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E0E0E0'
        }}>
          {/* Фото профиля */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#F5F5F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={fullName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '👤';
                }}
              />
            ) : (
              <div style={{ fontSize: '30px' }}>👤</div>
            )}
          </div>

          {/* Информация о пользователе */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '4px',
              color: '#2D1B2E'
            }}>
              {fullName}
            </div>
            {username && (
              <div style={{ 
                fontSize: '14px', 
                color: '#495057',
                marginBottom: '8px'
              }}>
                {username}
              </div>
            )}
            <div style={{ 
              fontSize: '14px', 
              color: '#2D1B2E'
            }}>
              Бонусы: 0 (1 бонус = 1 рубль)
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveTab('addresses')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'addresses' ? '#FFCADC' : '#F5F5F5',
              color: activeTab === 'addresses' ? '#2D1B2E' : '#495057',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Адреса
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'orders' ? '#FFCADC' : '#F5F5F5',
              color: activeTab === 'orders' ? '#2D1B2E' : '#495057',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Заказы
          </button>
          <button
            onClick={() => setActiveTab('support')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'support' ? '#FFCADC' : '#F5F5F5',
              color: activeTab === 'support' ? '#2D1B2E' : '#495057',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Поддержка
          </button>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'addresses' && (
          <div>
            {addresses.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#495057',
                marginBottom: '20px'
              }}>
                Адресов пока нет.
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {addresses.map((addr, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      color: '#2D1B2E'
                    }}
                  >
                    {addr}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#2D1B2E'
              }}>
                Адрес
              </label>
              <input
                type="text"
                placeholder="Город, улица, дом..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E0E0E0',
                  fontSize: '14px',
                  color: '#2D1B2E',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
            <button
              onClick={handleSaveAddress}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#FFCADC',
                color: '#2D1B2E',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Сохранить
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6C757D'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Заказов пока нет</p>
            <p style={{ fontSize: '14px' }}>Ваши заказы будут отображаться здесь</p>
          </div>
        )}

        {activeTab === 'support' && (
          <div style={{
            padding: '20px',
            backgroundColor: '#F5F5F5',
            borderRadius: '8px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#2D1B2E'
            }}>
              Служба поддержки
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6C757D',
              marginBottom: '16px',
              lineHeight: '1.6'
            }}>
              Если у вас возникли вопросы или проблемы, свяжитесь с нами через бота.
            </p>
            <button
              onClick={() => {
                WebApp.openTelegramLink('https://t.me/FlowersStudioBot');
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#FFCADC',
                color: '#2D1B2E',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Написать в поддержку
            </button>
          </div>
        )}
      </div>

      {/* Плавающая кнопка корзины с суммой */}
      {cartItemsCount > 0 && (
        <div
          onClick={(e) => {
            e.preventDefault();
            navigate('/cart', { replace: false });
          }}
          style={{
            position: 'fixed',
            bottom: '60px',
            right: '16px',
            backgroundColor: '#FFCADC',
            color: '#2D1B2E',
            padding: '12px 20px',
            borderRadius: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 999,
            fontSize: '16px',
            fontWeight: '500'
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
          <span>{cartTotal.toLocaleString('ru-RU')} ₽</span>
        </div>
      )}

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
      
      {/* Footer с username бота */}
      <div style={{
        position: 'fixed',
        bottom: '50px',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '11px',
        color: '#6C757D',
        padding: '3px 0',
        backgroundColor: '#FFFFFF',
        zIndex: 998
      }}>
        @FlowersStudioBot
      </div>
    </div>
  );
}

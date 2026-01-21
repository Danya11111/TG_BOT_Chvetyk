import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { getOrders, OrdersListItem } from '../api/orders.api';
import { useProfileStore } from '../store/profile.store';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';

type TabType = 'addresses' | 'orders' | 'support';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [address, setAddress] = useState('');
  const [orders, setOrders] = useState<OrdersListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (activeTab !== 'orders') {
      return;
    }

    let isActive = true;
    setOrdersLoading(true);
    setOrdersError(null);

    getOrders()
      .then((data) => {
        if (!isActive) {
          return;
        }
        setOrders(data);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        console.error('Failed to load orders:', error);
        setOrdersError('Не удалось загрузить заказы. Попробуйте позже.');
      })
      .finally(() => {
        if (isActive) {
          setOrdersLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeTab]);

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
            backgroundColor: 'var(--bg-secondary)',
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
              color: 'var(--text-primary)'
            }}>
              {fullName}
            </div>
            {username && (
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                {username}
              </div>
            )}
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--text-primary)'
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
              backgroundColor: activeTab === 'addresses' ? 'var(--color-accent)' : 'var(--bg-secondary)',
              color: activeTab === 'addresses' ? 'var(--text-on-accent)' : 'var(--text-primary)',
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
              backgroundColor: activeTab === 'orders' ? 'var(--color-accent)' : 'var(--bg-secondary)',
              color: activeTab === 'orders' ? 'var(--text-on-accent)' : 'var(--text-primary)',
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
              backgroundColor: activeTab === 'support' ? 'var(--color-accent)' : 'var(--bg-secondary)',
              color: activeTab === 'support' ? 'var(--text-on-accent)' : 'var(--text-primary)',
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
                color: 'var(--text-secondary)',
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
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      color: 'var(--text-primary)'
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
                color: 'var(--text-primary)'
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
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
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
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-on-accent)',
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
          <div>
            {ordersLoading && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: 'var(--text-secondary)'
              }}>
                Загрузка заказов...
              </div>
            )}
            {ordersError && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#DC3545'
              }}>
                {ordersError}
              </div>
            )}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Заказов пока нет</p>
                <p style={{ fontSize: '14px' }}>Ваши заказы будут отображаться здесь</p>
              </div>
            )}
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                      Заказ #{order.order_number}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Статус: {order.status}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Оплата: {order.payment_status}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Сумма: {Number(order.total).toLocaleString('ru-RU')} ₽
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'support' && (
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: 'var(--text-primary)'
            }}>
              Служба поддержки
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
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
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-on-accent)',
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
            backgroundColor: 'var(--color-accent)',
            color: 'var(--text-on-accent)',
            padding: '12px 20px',
            borderRadius: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
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
            stroke="currentColor"
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

      <AppFooter />
      <BottomNavigation />
    </div>
  );
}

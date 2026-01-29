import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { getOrderStatus, getOrders, OrdersListItem, OrderStatusResponse } from '../api/orders.api';
import { requestSupport } from '../api/support.api';
import { getMe, updateMe, claimWelcomeBonus, UserMeResponse } from '../api/users.api';
import { ProfileAddress, useProfileStore } from '../store/profile.store';
import { useCustomerConfig } from '../hooks/useCustomerConfig';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';

type TabType = 'addresses' | 'orders' | 'support';

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [address, setAddress] = useState<ProfileAddress>({
    city: '',
    street: '',
    house: '',
    apartment: '',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrdersListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderStatusResponse>>({});
  const [orderDetailsLoading, setOrderDetailsLoading] = useState<Record<number, boolean>>({});
  const [supportRequestLoading, setSupportRequestLoading] = useState(false);
  const [me, setMe] = useState<UserMeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [welcomeBonusClaiming, setWelcomeBonusClaiming] = useState(false);
  const [welcomeBonusError, setWelcomeBonusError] = useState<string | null>(null);

  const cartTotal = useCartStore((state) => state.getTotal());
  const cartItemsCount = useCartStore((state) => state.getItemCount());
  const { addresses, addAddress, updateAddress, removeAddress } = useProfileStore();
  const { config } = useCustomerConfig();

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
    let isActive = true;
    setMeLoading(true);
    setMeError(null);
    getMe()
      .then((data) => {
        if (!isActive) return;
        setMe(data);
        setPhoneValue(data?.phone || '');
      })
      .catch((error) => {
        console.warn('Failed to load profile:', error);
        if (isActive) {
          setMeError('Не удалось загрузить профиль. Попробуйте позже.');
        }
      })
      .finally(() => {
        if (isActive) {
          setMeLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Устанавливаем город по умолчанию только один раз при загрузке конфигурации
  useEffect(() => {
    if (!address.city && config?.delivery?.city) {
      setAddress((prev) => ({ ...prev, city: config.delivery.city }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.delivery?.city]); // Убрали address.city из зависимостей, чтобы не перезаписывать при изменении пользователем

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as TabType | null;
    if (tab && ['addresses', 'orders', 'support'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

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

  // Функция для добавления префиксов к адресу
  const formatAddressForSave = (addr: ProfileAddress): ProfileAddress => {
    let city = addr.city?.trim() || '';
    let street = addr.street.trim() || '';
    
    // Добавляем префикс "г. " для города, если его еще нет
    if (city && !city.match(/^г\.\s*/i)) {
      city = `г. ${city}`;
    }
    
    // Добавляем префикс "ул. " для улицы, если его еще нет
    if (street && !street.match(/^(ул\.|улица|проспект|пр\.|переулок|пер\.|бульвар|б-р|площадь|пл\.)\s*/i)) {
      street = `ул. ${street}`;
    }
    
    return {
      city: city || undefined,
      street,
      house: addr.house.trim(),
      apartment: addr.apartment?.trim() || undefined,
    };
  };

  // Функция для удаления префиксов из адреса (для редактирования)
  const removeAddressPrefixes = (addr: ProfileAddress): ProfileAddress => {
    let city = addr.city || '';
    let street = addr.street || '';
    
    // Убираем префикс "г. " из города
    city = city.replace(/^г\.\s*/i, '').trim();
    
    // Убираем префиксы из улицы (ул., улица, проспект и т.д.)
    street = street.replace(/^(ул\.|улица|проспект|пр\.|переулок|пер\.|бульвар|б-р|площадь|пл\.)\s*/i, '').trim();
    
    return {
      city: city || undefined,
      street,
      house: addr.house || '',
      apartment: addr.apartment || undefined,
    };
  };

  const handleSaveAddress = () => {
    if (!address.street.trim() || !address.house.trim()) {
      WebApp.showAlert('Укажите улицу и дом.');
      return;
    }

    const addressToSave = formatAddressForSave(address);

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < addresses.length) {
      // Обновляем существующий адрес
      try {
        updateAddress(editingIndex, addressToSave);
        // Сбрасываем состояние редактирования ПЕРЕД показом алерта
        setEditingIndex(null);
        setAddress({ city: '', street: '', house: '', apartment: '' });
        // Небольшая задержка для обновления UI
        setTimeout(() => {
          WebApp.showAlert('Адрес обновлен!');
        }, 100);
      } catch (error) {
        console.error('Error updating address:', error);
        WebApp.showAlert('Ошибка при обновлении адреса. Попробуйте еще раз.');
      }
    } else {
      // Добавляем новый адрес
      try {
        addAddress(addressToSave);
        setAddress({ city: '', street: '', house: '', apartment: '' });
        setTimeout(() => {
          WebApp.showAlert('Адрес сохранен!');
        }, 100);
      } catch (error) {
        console.error('Error adding address:', error);
        WebApp.showAlert('Ошибка при сохранении адреса. Попробуйте еще раз.');
      }
    }
  };

  const handleEditAddress = (index: number) => {
    const addr = addresses[index];
    // Убираем префиксы при редактировании, чтобы пользователь видел чистые значения
    const addressWithoutPrefixes = removeAddressPrefixes(addr);
    setAddress({
      city: addressWithoutPrefixes.city || '',
      street: addressWithoutPrefixes.street || '',
      house: addressWithoutPrefixes.house || '',
      apartment: addressWithoutPrefixes.apartment || '',
    });
    setEditingIndex(index);
    // Прокрутка к форме
    setTimeout(() => {
      const formElement = document.querySelector('[data-address-form]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleDeleteAddress = (index: number) => {
    WebApp.showConfirm('Удалить этот адрес?', (confirmed) => {
      if (confirmed) {
        removeAddress(index);
        WebApp.showAlert('Адрес удален');
        if (editingIndex === index) {
          setEditingIndex(null);
          setAddress({ city: '', street: '', house: '', apartment: '' });
        }
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setAddress({ city: '', street: '', house: '', apartment: '' });
  };

  const formatAddress = (addr: ProfileAddress) => {
    const parts = [addr.city, addr.street, addr.house].filter(Boolean);
    const base = parts.join(', ');
    return addr.apartment ? `${base}, кв. ${addr.apartment}` : base;
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'new':
        return 'Новый';
      case 'pending':
        return 'Ожидает подтверждения';
      case 'confirmed':
        return 'Подтвержден';
      case 'processing':
        return 'В обработке';
      case 'ready':
        return 'Готов к выдаче';
      case 'shipped':
        return 'Отправлен';
      case 'in_delivery':
        return 'Доставка';
      case 'delivered':
        return 'Доставлен';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      case 'refunded':
        return 'Возврат';
      case 'receipt':
        return 'Чек отправлен';
      default:
        return status || '—';
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending_confirmation':
        return 'Ожидает подтверждения';
      case 'confirmed':
        return 'Подтверждена';
      case 'rejected':
        return 'Отклонена';
      default:
        return status || '—';
    }
  };

  const getPaymentTypeLabel = (type?: string) => {
    switch (type) {
      case 'card_requisites':
        return 'Оплата по номеру телефона';
      case 'sbp_qr':
        return 'Оплата по QR-коду СБП';
      default:
        return type || '—';
    }
  };

  const handleToggleOrder = async (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (orderDetails[orderId]) {
      return;
    }
    setOrderDetailsLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const details = await getOrderStatus(orderId);
      setOrderDetails((prev) => ({ ...prev, [orderId]: details }));
    } catch (error) {
      console.error('Failed to load order details:', error);
      WebApp.showAlert('Не удалось загрузить детали заказа.');
    } finally {
      setOrderDetailsLoading((prev) => ({ ...prev, [orderId]: false }));
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
        borderBottom: '1px solid var(--border-light)'
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
          borderBottom: '1px solid var(--border-soft)'
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
            <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              {meLoading && <span>Загрузка…</span>}
              {meError && (
                <div style={{ fontSize: '12px', color: 'var(--color-error)', marginBottom: '6px' }}>
                  {meError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Карточка: Телефон, адреса и бонусы */}
        {!meLoading && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Контакт и бонусы
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Телефон</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  placeholder="+7 999 000-00-00"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                />
                <button
                  onClick={async () => {
                    if (phoneSaving) return;
                    try {
                      setPhoneSaving(true);
                      const updated = await updateMe({ phone: phoneValue });
                      setMe(updated);
                      setPhoneValue(updated.phone || '');
                      try { WebApp.showAlert('Телефон сохранён'); } catch { /* ignore */ }
                    } catch (e) {
                      console.error('Failed to update phone:', e);
                      try { WebApp.showAlert('Не удалось сохранить телефон'); } catch { /* ignore */ }
                    } finally {
                      setPhoneSaving(false);
                    }
                  }}
                  disabled={phoneSaving}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--text-on-accent)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: phoneSaving ? 'not-allowed' : 'pointer',
                    opacity: phoneSaving ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {phoneSaving ? '…' : 'Сохранить'}
                </button>
              </div>
            </div>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              marginBottom: '6px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Бонусы: <strong style={{ fontSize: '18px', color: 'var(--color-accent)' }}>{Number(me?.bonus?.balance ?? 0).toLocaleString('ru-RU')} ₽</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}> (1 бонус = 1 ₽)</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Категория: <strong style={{ color: 'var(--text-primary)' }}>{me?.bonus?.tier?.title || '—'}</strong> · Кэшбек {Number(me?.bonus?.cashbackPercent ?? 0)}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Получите 500 бонусов в подарок — введите телефон и нажмите кнопку ниже.
              </div>
            </div>
            {me?.welcomeBonusClaimed === false && (
              <div style={{ marginTop: '12px' }}>
                {welcomeBonusError && (
                  <div style={{ fontSize: '12px', color: 'var(--color-error)', marginBottom: '8px' }}>
                    {welcomeBonusError}
                  </div>
                )}
                <button
                  type="button"
                  disabled={welcomeBonusClaiming}
                  onClick={async () => {
                    const phone = phoneValue.trim().replace(/\s/g, '');
                    if (!phone) {
                      setWelcomeBonusError('Введите номер телефона');
                      return;
                    }
                    if (!/^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/.test(phone)) {
                      setWelcomeBonusError('Введите корректный номер телефона');
                      return;
                    }
                    setWelcomeBonusError(null);
                    setWelcomeBonusClaiming(true);
                    try {
                      const res = await claimWelcomeBonus(phone);
                      setMe((prev) => prev ? {
                        ...prev,
                        welcomeBonusClaimed: true,
                        bonus: { ...prev.bonus, balance: res.bonusBalance },
                      } : prev);
                      setPhoneValue(phone);
                      try { WebApp.showAlert('Вам начислено 500 бонусов!'); } catch { /* ignore */ }
                    } catch (e: unknown) {
                      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
                      setWelcomeBonusError(typeof msg === 'string' ? msg : 'Не удалось получить бонусы. Попробуйте позже.');
                    } finally {
                      setWelcomeBonusClaiming(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(90deg, rgba(215, 149, 176, 0.7), var(--color-accent))',
                    color: 'var(--text-on-accent)',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: welcomeBonusClaiming ? 'not-allowed' : 'pointer',
                    opacity: welcomeBonusClaiming ? 0.8 : 1,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {welcomeBonusClaiming ? 'Загрузка…' : '🎁 Получить 500 бонусов'}
                  </span>
                  {!welcomeBonusClaiming && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                        animation: 'profile-shimmer 2s infinite',
                      }}
                    />
                  )}
                </button>
              </div>
            )}
            {me?.welcomeBonusClaimed === true && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
              }}>
                ✓ Приветственный бонус получен
              </div>
            )}
          </div>
        )}

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
                {addresses.map((addr, index) => {
                  const addressKey = `${addr.street}-${addr.house}-${addr.apartment || ''}-${index}`;
                  const isEditing = editingIndex === index;
                  
                  return (
                    <div
                      key={addressKey}
                      style={{
                        padding: '12px',
                        backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-secondary)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        border: isEditing ? '2px solid var(--color-accent)' : 'none'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                        {formatAddress(addr)}
                      </div>
                      {!isEditing && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '6px', 
                          flexShrink: 0,
                          alignItems: 'center'
                        }}>
                          <button
                            onClick={() => handleEditAddress(index)}
                            style={{
                              width: '36px',
                              height: '36px',
                              padding: 0,
                              borderRadius: '8px',
                              border: '1px solid var(--border-light)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              fontSize: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.transform = 'scale(0.95)';
                              e.currentTarget.style.backgroundColor = 'rgba(215, 149, 176, 0.1)';
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                            }}
                            title="Изменить адрес"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(index)}
                            style={{
                              width: '36px',
                              height: '36px',
                              padding: 0,
                              borderRadius: '8px',
                              border: '1px solid rgba(231, 76, 60, 0.3)',
                              backgroundColor: 'var(--bg-surface)',
                              color: '#e74c3c',
                              fontSize: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(231, 76, 60, 0.15)'
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.transform = 'scale(0.95)';
                              e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                            }}
                            title="Удалить адрес"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div data-address-form>
              {editingIndex !== null && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '2px solid var(--color-accent)'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                  }}>
                    Редактирование адреса
                  </div>
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
                placeholder={`Город (${config?.delivery?.city || 'Чебоксары'})`}
                value={address.city || ''}
                onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Улица"
                value={address.street}
                onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'stretch' }}>
              <input
                type="text"
                placeholder="Дом"
                value={address.house}
                onChange={(e) => setAddress((prev) => ({ ...prev, house: e.target.value }))}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                placeholder="Квартира"
                value={address.apartment || ''}
                onChange={(e) => setAddress((prev) => ({ ...prev, apartment: e.target.value }))}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSaveAddress}
                style={{
                  flex: 1,
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
                {editingIndex !== null ? 'Сохранить изменения' : 'Сохранить'}
              </button>
              {editingIndex !== null && (
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => {
                    WebApp.showConfirm('Очистить список заказов с экрана? При следующем открытии вкладки заказы снова подгрузятся.', (ok) => {
                      if (ok) setOrders([]);
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Очистить историю заказов
                </button>
              </div>
            )}
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
                color: 'var(--color-error)'
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
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                      Заказ #{order.order_number}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Статус: {getStatusLabel(order.status)}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Оплата: {getPaymentStatusLabel(order.payment_status)}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Сумма: {Number(order.total).toLocaleString('ru-RU')} ₽
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                    </div>
                    <button
                      onClick={() => handleToggleOrder(order.id)}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      {expandedOrderId === order.id ? 'Скрыть детали' : 'Подробнее'}
                    </button>
                    {expandedOrderId === order.id && (
                      <div style={{ marginTop: '12px', fontSize: '14px' }}>
                        {orderDetailsLoading[order.id] && (
                          <div style={{ color: 'var(--text-secondary)' }}>Загрузка деталей...</div>
                        )}
                        {orderDetails[order.id] && orderDetails[order.id].items && (
                          <>
                            <div style={{ marginBottom: '8px' }}>
                              <div>Оплата: {getPaymentTypeLabel(orderDetails[order.id].payment_type)}</div>
                              <div>
                                Доставка: {orderDetails[order.id].delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}
                              </div>
                              {orderDetails[order.id].delivery_type === 'delivery' && orderDetails[order.id].delivery_address && (
                                <div>
                                  Адрес: {[
                                    orderDetails[order.id].delivery_address?.city,
                                    orderDetails[order.id].delivery_address?.street,
                                    orderDetails[order.id].delivery_address?.house,
                                  ].filter(Boolean).join(', ')}
                                  {orderDetails[order.id].delivery_address?.apartment
                                    ? `, кв. ${orderDetails[order.id].delivery_address?.apartment}`
                                    : ''}
                                </div>
                              )}
                              {orderDetails[order.id].delivery_date && orderDetails[order.id].delivery_time && (
                                <div>
                                  Дата/время: {orderDetails[order.id].delivery_date} {orderDetails[order.id].delivery_time}
                                </div>
                              )}
                              {orderDetails[order.id].recipient_name && (
                                <div>
                                  Получатель: {orderDetails[order.id].recipient_name} ({orderDetails[order.id].recipient_phone})
                                </div>
                              )}
                              {orderDetails[order.id].card_text && (
                                <div>Открытка: {orderDetails[order.id].card_text}</div>
                              )}
                              {orderDetails[order.id].comment && (
                                <div>Комментарий: {orderDetails[order.id].comment}</div>
                              )}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Состав заказа:</strong>
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {orderDetails[order.id].items && orderDetails[order.id].items.length > 0 ? (
                                  orderDetails[order.id].items.map((item, idx) => (
                                    <div key={`${item.product_name}-${idx}`}>
                                      {item.product_name} × {item.quantity} = {Number(item.total).toLocaleString('ru-RU')} ₽
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ color: 'var(--text-secondary)' }}>Нет данных о товарах</div>
                                )}
                              </div>
                            </div>
                            {orderDetails[order.id].history?.length ? (
                              <div>
                                <strong>История:</strong>
                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {orderDetails[order.id].history?.map((entry, idx) => (
                                    <div key={`${entry.status}-${idx}`} style={{ color: 'var(--text-secondary)' }}>
                                      {new Date(entry.changed_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} — {getStatusLabel(entry.status)}
                                      {entry.comment ? ` (${entry.comment})` : ''}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
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
              onClick={async () => {
                if (supportRequestLoading) {
                  return;
                }
                try {
                  setSupportRequestLoading(true);
                  await requestSupport();
                  WebApp.close();
                } catch (e) {
                  console.error('Failed to request support:', e);
                  try {
                    WebApp.showAlert('Не удалось открыть поддержку. Попробуйте ещё раз.');
                  } catch {
                    // ignore
                  }
                } finally {
                  setSupportRequestLoading(false);
                }
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
                cursor: supportRequestLoading ? 'not-allowed' : 'pointer',
                opacity: supportRequestLoading ? 0.7 : 1
              }}
              disabled={supportRequestLoading}
            >
              {supportRequestLoading ? 'Открываем поддержку…' : 'Написать в поддержку'}
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

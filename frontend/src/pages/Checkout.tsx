import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useCheckoutStore, CheckoutFormData, DeliveryAddress } from '../store/checkout.store';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { formData: savedFormData, saveFormData, clearFormData } = useCheckoutStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Загружаем сохраненные данные или используем значения по умолчанию
  const getInitialFormData = (): CheckoutFormData => {
    if (savedFormData) {
      return savedFormData;
    }
    
    // Получаем имя из Telegram, если доступно
    const userName = WebApp.initDataUnsafe?.user?.first_name || '';
    
    return {
      name: userName,
      phone: '',
      email: '',
      deliveryType: 'delivery',
      address: {
        city: 'Москва',
        street: '',
        house: '',
        apartment: '',
      },
      comment: '',
      paymentType: 'cash',
    };
  };

  const [formData, setFormData] = useState<CheckoutFormData>(() => getInitialFormData());

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите имя';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите телефон';
    } else if (!/^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Введите корректный номер телефона';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (formData.deliveryType === 'delivery') {
      if (!formData.address.street.trim()) {
        newErrors.street = 'Введите улицу';
      }
      if (!formData.address.house.trim()) {
        newErrors.house = 'Введите номер дома';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    const isValid = validateForm();
    if (!isValid) {
      WebApp.showAlert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      // TODO: Отправка заказа на backend после интеграции с Posiflora
      // Пока просто показываем успешное сообщение
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация запроса
      
      WebApp.showAlert('Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.');
      
      // Очистка корзины и данных формы, переход на главную
      clearCart();
      clearFormData();
      navigate('/');
    } catch (error) {
      console.error('Error creating order:', error);
      WebApp.showAlert('Произошла ошибка при оформлении заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, clearCart, clearFormData, navigate]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: false });
      return;
    }

    const total = getTotal();
    WebApp.MainButton.setText(`Оформить заказ - ${total.toLocaleString('ru-RU')} ₽`);
    WebApp.MainButton.show();
    
    const handleClick = () => {
      handleSubmit();
    };
    WebApp.MainButton.onClick(handleClick);

    return () => {
      WebApp.MainButton.hide();
    };
  }, [items.length, getTotal, handleSubmit, navigate]);

  const handleInputChange = (field: keyof CheckoutFormData, value: any) => {
    const updatedData = {
      ...formData,
      [field]: value,
    };
    setFormData(updatedData);
    // Сохраняем данные при каждом изменении
    saveFormData(updatedData);
    // Очистка ошибки при изменении поля
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    const updatedData = {
      ...formData,
      address: {
        ...formData.address,
        [field]: value,
      },
    };
    setFormData(updatedData);
    // Сохраняем данные при каждом изменении
    saveFormData(updatedData);
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFFFF',
      paddingBottom: '100px'
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
            navigate('/cart', { replace: false });
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
          Оформление заказа
        </div>
      </div>

      <div className="container" style={{ paddingTop: '20px' }}>

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p>Оформление заказа...</p>
          </div>
        </div>
      )}

      {/* Контактная информация */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #DEE2E6'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#2D1B2E' }}>
          Контактная информация
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2D1B2E' }}>
            Имя <span style={{ color: '#DC3545' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Введите ваше имя"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: errors.name ? '2px solid #DC3545' : '1px solid #DEE2E6',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: '#2D1B2E',
              backgroundColor: '#FFFFFF'
            }}
          />
          {errors.name && (
            <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2D1B2E' }}>
            Телефон <span style={{ color: '#DC3545' }}>*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: errors.phone ? '2px solid #DC3545' : '1px solid #DEE2E6',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: '#2D1B2E',
              backgroundColor: '#FFFFFF'
            }}
          />
          {errors.phone && (
            <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.phone}</p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2D1B2E' }}>
            Email (необязательно)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="email@example.com"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: errors.email ? '2px solid #DC3545' : '1px solid #DEE2E6',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: '#2D1B2E',
              backgroundColor: '#FFFFFF'
            }}
          />
          {errors.email && (
            <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>
          )}
        </div>
      </div>

      {/* Тип доставки */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #DEE2E6'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#2D1B2E' }}>
          Способ получения
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            border: formData.deliveryType === 'delivery' ? '2px solid #FF6B9D' : '1px solid #DEE2E6',
            cursor: 'pointer',
            backgroundColor: formData.deliveryType === 'delivery' ? '#FFF0F5' : '#FFFFFF'
          }}>
            <input
              type="radio"
              name="deliveryType"
              value="delivery"
              checked={formData.deliveryType === 'delivery'}
              onChange={(e) => handleInputChange('deliveryType', e.target.value)}
              style={{ marginRight: '12px', width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: '500', color: '#2D1B2E' }}>🚚 Доставка</div>
              <div style={{ fontSize: '12px', color: '#495057' }}>Доставим по указанному адресу</div>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            border: formData.deliveryType === 'pickup' ? '2px solid #FF6B9D' : '1px solid #DEE2E6',
            cursor: 'pointer',
            backgroundColor: formData.deliveryType === 'pickup' ? '#FFF0F5' : '#FFFFFF'
          }}>
            <input
              type="radio"
              name="deliveryType"
              value="pickup"
              checked={formData.deliveryType === 'pickup'}
              onChange={(e) => handleInputChange('deliveryType', e.target.value)}
              style={{ marginRight: '12px', width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: '500', color: '#2D1B2E' }}>📍 Самовывоз</div>
              <div style={{ fontSize: '12px', color: '#495057' }}>Заберёте из нашего магазина</div>
            </div>
          </label>
        </div>

        {/* Адрес доставки */}
        {formData.deliveryType === 'delivery' && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: '500', color: '#2D1B2E' }}>
              Адрес доставки
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder="Улица"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: errors.street ? '2px solid #DC3545' : '1px solid #DEE2E6',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.street && (
                <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.street}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.address.house}
                  onChange={(e) => handleAddressChange('house', e.target.value)}
                  placeholder="Дом"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: errors.house ? '2px solid #DC3545' : '1px solid #DEE2E6',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: '#2D1B2E',
                    backgroundColor: '#FFFFFF'
                  }}
                />
                {errors.house && (
                  <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.house}</p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={formData.address.apartment || ''}
                  onChange={(e) => handleAddressChange('apartment', e.target.value)}
                  placeholder="Квартира (необяз.)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #DEE2E6',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: '#2D1B2E',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Способ оплаты */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #DEE2E6'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#2D1B2E' }}>
          Способ оплаты
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { value: 'cash', label: 'Наличными при получении', icon: '💵' },
            { value: 'card', label: 'Картой при получении', icon: '💳' },
            { value: 'online', label: 'Онлайн оплата', icon: '💻' },
          ].map((payment) => (
            <label
              key={payment.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                borderRadius: '8px',
                border: formData.paymentType === payment.value ? '2px solid #FF6B9D' : '1px solid #DEE2E6',
                cursor: 'pointer',
                backgroundColor: formData.paymentType === payment.value ? '#FFF0F5' : '#FFFFFF'
              }}
            >
              <input
                type="radio"
                name="paymentType"
                value={payment.value}
                checked={formData.paymentType === payment.value}
                onChange={(e) => handleInputChange('paymentType', e.target.value)}
                style={{ marginRight: '12px', width: '20px', height: '20px' }}
              />
              <span style={{ marginRight: '8px', fontSize: '20px' }}>{payment.icon}</span>
              <span style={{ fontWeight: '500', color: '#2D1B2E' }}>{payment.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Комментарий */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #DEE2E6'
      }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2D1B2E' }}>
          Комментарий к заказу
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => handleInputChange('comment', e.target.value)}
          placeholder="Дополнительная информация для курьера..."
          rows={4}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #DEE2E6',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            color: '#2D1B2E',
            backgroundColor: '#FFFFFF'
          }}
        />
      </div>

      {/* Итого */}
      <div style={{
        backgroundColor: '#F8F9FA',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#2D1B2E' }}>Итого:</span>
          <span style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#FFCADC'
          }}>
            {getTotal().toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}

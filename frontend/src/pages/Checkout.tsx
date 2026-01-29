import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';
import { getTelegramInitData } from '../utils/initData';
import { useCartStore } from '../store/cart.store';
import { useCheckoutStore, CheckoutFormData, DeliveryAddress } from '../store/checkout.store';
import { useProfileStore } from '../store/profile.store';
import { createOrder, getOrderStatus, uploadReceipt, cancelOrder } from '../api/orders.api';
import { getMe, UserMeResponse } from '../api/users.api';
import { useCustomerConfig } from '../hooks/useCustomerConfig';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';

type ApiErrorShape = {
  error?: {
    message?: unknown;
  };
};

const extractApiErrorMessage = (error: unknown): string | null => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as unknown;
    if (data && typeof data === 'object') {
      const message = (data as ApiErrorShape)?.error?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return null;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { formData: savedFormData, saveFormData } = useCheckoutStore();
  const { addresses: savedAddresses } = useProfileStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [me, setMe] = useState<UserMeResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'confirmed' | 'rejected'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment'>('form');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [orderBonusUsed, setOrderBonusUsed] = useState<number>(0);
  const [cancelOrderLoading, setCancelOrderLoading] = useState(false);
  const { config: customerConfig } = useCustomerConfig();

  /** Минимальное время для выбранной даты: для «сегодня» = сейчас + 2 ч, округление вверх до 15 мин; для других дней — пусто. */
  const getMinDeliveryTime = useCallback((dateValue?: string): string => {
    if (!dateValue) return '';
    const now = new Date();
    const deliveryDate = new Date(dateValue + 'T00:00:00');
    if (Number.isNaN(deliveryDate.getTime())) return '';
    const isSameDay = now.toDateString() === deliveryDate.toDateString();
    if (!isSameDay) return '';
    const minMs = now.getTime() + 2 * 60 * 60 * 1000;
    const minDate = new Date(minMs);
    const totalMinutes = minDate.getHours() * 60 + minDate.getMinutes();
    const slot = Math.ceil(totalMinutes / 15) * 15;
    const hours = Math.floor(slot / 60) % 24;
    const mins = slot % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }, []);

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
        city: 'Чебоксары',
        street: '',
        house: '',
        apartment: '',
      },
      deliveryAsReady: true,
      deliveryDate: '',
      deliveryTime: '',
      recipientName: '',
      recipientPhone: '',
      cardText: '',
      comment: '',
      paymentType: 'card_requisites',
      useBonuses: false,
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

    const deliveryAsReady = formData.deliveryAsReady !== false;
    if (!deliveryAsReady) {
      if (!formData.deliveryDate) {
        newErrors.deliveryDate = 'Укажите дату';
      }
      if (!formData.deliveryTime) {
        newErrors.deliveryTime = 'Укажите время';
      } else if (formData.deliveryType === 'delivery' && formData.deliveryDate) {
        const minTime = getMinDeliveryTime(formData.deliveryDate);
        if (minTime && formData.deliveryTime < minTime) {
          newErrors.deliveryTime = `Минимальное время доставки — ${minTime}`;
        }
      }
    }

    if (!formData.recipientName?.trim()) {
      newErrors.recipientName = 'Введите имя получателя';
    }

    if (!formData.recipientPhone?.trim()) {
      newErrors.recipientPhone = 'Введите телефон получателя';
    } else if (!/^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/.test(formData.recipientPhone.replace(/\s/g, ''))) {
      newErrors.recipientPhone = 'Введите корректный номер';
    }

    if (!formData.cardText?.trim()) {
      newErrors.cardText = 'Добавьте текст открытки';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, getMinDeliveryTime]);

  const showAlert = useCallback((message: string) => {
    try {
      if (WebApp?.showAlert) {
        WebApp.showAlert(message);
        return;
      }
    } catch {
      // fallback below
    }
    window.alert(message);
  }, []);

  // Функция handlePaymentCompleted удалена - клиент больше не нажимает "Оплата завершена"
  // Клиент только загружает чек, подтверждение происходит менеджером в Telegram группе

  const handleProceedToPayment = useCallback(async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      const errorMessage = 'Не удалось получить данные Telegram. Откройте mini app из бота.';
      showAlert(errorMessage);
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      showAlert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (orderId) {
      setPaymentStep('payment');
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const createdOrder = await createOrder(formData, items);

      setOrderId(createdOrder.id);
      setOrderNumber(createdOrder.orderNumber);
      setOrderTotal(createdOrder.total);
      setOrderBonusUsed(createdOrder.bonusUsed ?? 0);
      setPaymentStatus('processing');
      setStatusMessage('Заказ оформлен. Ожидаем подтверждения оплаты.');

      setPaymentStep('payment');
    } catch (error) {
      console.error('Error creating order:', error);
      showAlert(
        extractApiErrorMessage(error) || 'Произошла ошибка при оформлении заказа. Попробуйте позже.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    formData,
    validateForm,
    orderId,
    clearCart,
    items,
    showAlert,
  ]);

  const handleCopyRequisite = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        showAlert(`${label} скопирован`);
      } catch (error) {
        console.error('Failed to copy requisite:', error);
        showAlert(`Не удалось скопировать ${label.toLowerCase()}`);
      }
    },
    [showAlert]
  );

  const handleReceiptChange = useCallback(
    (file?: File | null) => {
      if (!file) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        showAlert('Можно загрузить только изображение.');
        return;
      }
      const maxSize = 4 * 1024 * 1024;
      if (file.size > maxSize) {
        showAlert('Размер изображения не должен превышать 4 МБ.');
        return;
      }
      setReceiptError(null);
      setReceiptSent(false);
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setReceiptPreview(result);
        } else {
          showAlert('Не удалось прочитать файл.');
        }
      };
      reader.onerror = () => {
        showAlert('Не удалось прочитать файл.');
      };
      reader.readAsDataURL(file);
    },
    [showAlert]
  );

  const handleUploadReceipt = useCallback(async () => {
    if (!orderId) {
      showAlert('Сначала оформите заказ.');
      return;
    }
    if (!receiptPreview) {
      showAlert('Выберите изображение чека.');
      return;
    }
    setReceiptUploading(true);
    setReceiptError(null);
    try {
      await uploadReceipt(orderId, receiptPreview, receiptFileName);
      setReceiptSent(true);
      setReceiptError(null);
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      const errorMessage = extractApiErrorMessage(error) || 'Не удалось отправить чек. Попробуйте позже.';
      setReceiptError(errorMessage);
      showAlert(errorMessage);
    } finally {
      setReceiptUploading(false);
    }
  }, [orderId, receiptPreview, receiptFileName]);

  const handleCompleteOrder = useCallback(() => {
    if (!receiptSent || !orderId) return;
    clearCart();
    setShowThankYouModal(true);
  }, [receiptSent, orderId, clearCart]);

  const handleCancelOrder = useCallback(async () => {
    if (!orderId) return;
    const confirmed = window.confirm(
      'Отменить заказ? Вы вернётесь к данным заказа, заказ будет отменён.'
    );
    if (!confirmed) return;
    setCancelOrderLoading(true);
    try {
      await cancelOrder(orderId);
      setOrderId(null);
      setOrderNumber(null);
      setOrderTotal(null);
      setOrderBonusUsed(0);
      setPaymentStep('form');
      setPaymentStatus('idle');
      setReceiptSent(false);
      setReceiptPreview(null);
      setReceiptFileName(null);
      setReceiptError(null);
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      setReceiptError(msg || 'Не удалось отменить заказ');
    } finally {
      setCancelOrderLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (items.length === 0 && !orderId && paymentStep === 'form' && !loading) {
      navigate('/cart', { replace: false });
    }
  }, [items.length, orderId, paymentStep, loading, navigate]);

  useEffect(() => {
    WebApp.MainButton.hide();
  }, []);

  useEffect(() => {
    let isActive = true;
    getMe()
      .then((data) => {
        if (!isActive) return;
        setMe(data);
      })
      .catch((error) => {
        console.warn('Failed to load user profile:', error);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (orderId) return;
    const phone = me?.phone || '';
    if (!phone.trim()) return;
    if (formData.phone.trim()) return;
    const updatedData = { ...formData, phone };
    setFormData(updatedData);
    saveFormData(updatedData);
  }, [me?.phone, orderId, formData, saveFormData]);

  useEffect(() => {
    if (orderId || formData.deliveryAsReady !== false) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!formData.deliveryDate) {
      const minT = getMinDeliveryTime(today);
      const next = { ...formData, deliveryDate: today, deliveryTime: minT || '12:00' };
      setFormData(next);
      saveFormData(next);
    }
  }, [formData.deliveryAsReady, formData.deliveryDate, orderId, formData, saveFormData]);

  useEffect(() => {
    if (!customerConfig?.delivery?.city || orderId) {
      return;
    }
    if (formData.address.city && formData.address.city !== 'Чебоксары') {
      return;
    }
    if (formData.address.city === customerConfig.delivery.city) {
      return;
    }
    const updatedData = {
      ...formData,
      address: {
        ...formData.address,
        city: customerConfig.delivery.city,
      },
    };
    setFormData(updatedData);
    saveFormData(updatedData);
  }, [customerConfig?.delivery?.city, orderId, formData, saveFormData]);

  useEffect(() => {
    if (orderId || formData.deliveryType !== 'delivery') {
      return;
    }
    if (!savedAddresses.length) {
      return;
    }
    if (formData.address.street || formData.address.house) {
      return;
    }
    const [first] = savedAddresses;
    const updatedData = {
      ...formData,
      address: {
        ...formData.address,
        city: first.city || formData.address.city,
        street: first.street || '',
        house: first.house || '',
        apartment: first.apartment || '',
      },
    };
    setFormData(updatedData);
    saveFormData(updatedData);
  }, [savedAddresses, formData, orderId, saveFormData]);


  useEffect(() => {
    if (!orderId || paymentStatus !== 'processing' || receiptSent) {
      return;
    }

    let isActive = true;

    const fetchStatus = async () => {
      try {
        const status = await getOrderStatus(orderId);
        if (!isActive) {
          return;
        }
        if (status.paymentStatus === 'confirmed') {
          setPaymentStatus('confirmed');
          setStatusMessage('Заказ успешно оплачен');
        } else if (status.paymentStatus === 'rejected') {
          setPaymentStatus('rejected');
          setStatusMessage('Оплата не прошла');
        } else {
          setStatusMessage('Платеж обрабатывается');
        }
      } catch (error) {
        console.error('Error fetching order status:', error);
      }
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 8000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [orderId, paymentStatus, receiptSent]);

  const handleInputChange = <K extends keyof CheckoutFormData>(field: K, value: CheckoutFormData[K]) => {
    if (orderId) {
      return;
    }
    const updatedData = {
      ...formData,
      [field]: value,
    } as CheckoutFormData;
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
    if (orderId) {
      return;
    }
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

  const handleSelectSavedAddress = (address: {
    city?: string;
    street: string;
    house: string;
    apartment?: string;
  }) => {
    if (orderId) {
      return;
    }
    const updatedData = {
      ...formData,
      address: {
        ...formData.address,
        city: address.city || formData.address.city,
        street: address.street || '',
        house: address.house || '',
        apartment: address.apartment || '',
      },
    };
    setFormData(updatedData);
    saveFormData(updatedData);
  };

  const isOrderLocked = orderId !== null;
  const cartSubtotal = getTotal();
  const bonusBalance = Number(me?.bonus?.balance || 0);
  const maxSpendPercent = Number(me?.bonus?.maxSpendPercent || 10);
  const maxBonusToUse = Math.max(
    0,
    Math.floor(Math.min(bonusBalance, (cartSubtotal * maxSpendPercent) / 100))
  );
  const bonusesApplied = formData.useBonuses ? maxBonusToUse : 0;
  const payableTotal = Math.max(0, cartSubtotal - bonusesApplied);
  const displayedTotal = orderTotal !== null ? orderTotal : payableTotal;
  const sbpEnabled = Boolean(customerConfig?.sbpQr?.enabled);
  const sbpLabel = sbpEnabled
    ? 'Оплата по QR-коду СБП'
    : `Оплата по QR-коду СБП (${customerConfig?.sbpQr?.note || 'скоро'})`;
  const paymentOptions = [
    { value: 'card_requisites', label: 'Оплата по номеру телефона', icon: '📱', disabled: false },
    { value: 'sbp_qr', label: sbpLabel, icon: '📱', disabled: !sbpEnabled },
  ] as const;
  const selectedPaymentLabel = paymentOptions.find((payment) => payment.value === formData.paymentType)?.label;
  const cardRequisitesDetails = customerConfig?.cardRequisites.details || [];
  const requisitesMainLine = cardRequisitesDetails.find((line) => {
    const lower = line.toLowerCase();
    return lower.includes('номер телефона') || lower.includes('телефон') || lower.includes('номер карты');
  });
  const requisitesMainLabel = requisitesMainLine?.split(':')[0]?.trim() || 'Реквизит';
  const requisitesMainValue = requisitesMainLine?.split(':').slice(1).join(':').trim();
  const requisitesOtherDetails = requisitesMainLine
    ? cardRequisitesDetails.filter((line) => line !== requisitesMainLine)
    : cardRequisitesDetails;
  const deliveryZonesText = customerConfig?.delivery?.zones
    ?.map((zone) => `${zone.name} — ${zone.price}`)
    .join('; ');

  if (items.length === 0 && !orderId) {
    return null;
  }

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
            stroke="currentColor"
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
          backgroundColor: 'var(--bg-overlay)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p>Оформление заказа...</p>
          </div>
        </div>
      )}

      {paymentStep === 'form' && (
        <>
      {/* Контактная информация */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Контактная информация
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Имя <span style={{ color: 'var(--color-error)' }}>*</span>
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
              border: errors.name ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-surface)'
            }}
          />
          {errors.name && (
            <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Телефон <span style={{ color: 'var(--color-error)' }}>*</span>
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
              border: errors.phone ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-surface)'
            }}
          />
          {errors.phone && (
            <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.phone}</p>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
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
              border: errors.email ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
              fontSize: '16px',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-surface)'
            }}
          />
          {errors.email && (
            <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>
          )}
        </div>
      </div>

      {/* Тип доставки */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Способ получения
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            border: formData.deliveryType === 'delivery' ? '2px solid var(--color-accent)' : '1px solid var(--border-soft)',
            cursor: 'pointer',
            backgroundColor: formData.deliveryType === 'delivery' ? 'var(--bg-secondary)' : 'var(--bg-surface)'
          }}>
            <input
              type="radio"
              name="deliveryType"
              value="delivery"
              checked={formData.deliveryType === 'delivery'}
              onChange={() => handleInputChange('deliveryType', 'delivery')}
              style={{ marginRight: '12px', width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>🚚 Доставка</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Доставим по указанному адресу</div>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            border: formData.deliveryType === 'pickup' ? '2px solid var(--color-accent)' : '1px solid var(--border-soft)',
            cursor: 'pointer',
            backgroundColor: formData.deliveryType === 'pickup' ? 'var(--bg-secondary)' : 'var(--bg-surface)'
          }}>
            <input
              type="radio"
              name="deliveryType"
              value="pickup"
              checked={formData.deliveryType === 'pickup'}
              onChange={() => handleInputChange('deliveryType', 'pickup')}
              style={{ marginRight: '12px', width: '20px', height: '20px' }}
            />
            <div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>📍 Самовывоз</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Заберёте из нашего магазина</div>
            </div>
          </label>
        </div>

        {/* Адрес доставки */}
        {formData.deliveryType === 'delivery' && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Адрес доставки
            </h3>

            {savedAddresses.length > 0 && !orderId && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Сохранённые адреса</div>
                {savedAddresses.map((addr, index) => {
                  const addressLabel = [addr.city, addr.street, addr.house].filter(Boolean).join(', ');
                  const withApartment = addr.apartment ? `${addressLabel}, кв. ${addr.apartment}` : addressLabel;
                  const isActive =
                    formData.address.street === addr.street &&
                    formData.address.house === addr.house &&
                    (formData.address.apartment || '') === (addr.apartment || '');
                  return (
                    <button
                      key={`${addr.street}-${addr.house}-${index}`}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--border-light)',
                        backgroundColor: isActive ? 'var(--bg-secondary)' : 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {withApartment || 'Адрес без названия'}
                    </button>
                  );
                })}
              </div>
            )}

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
                  border: errors.street ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.street && (
                <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.street}</p>
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
                  border: errors.house ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                />
                {errors.house && (
                  <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.house}</p>
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
                    border: '1px solid var(--border-soft)',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                />
              </div>
            </div>
            {!orderId && (
              <button
                type="button"
                onClick={() => navigate('/profile?tab=addresses')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Добавить новый адрес
              </button>
            )}
          </div>
        )}
        
        <div style={{ marginTop: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--color-accent-transparent)', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Условия доставки</div>
          <div>• {deliveryZonesText || 'Тарифы будут добавлены позже.'}</div>
          <div>
            • Время работы доставки: {customerConfig?.delivery?.workingHours || '09:00–21:00'}
            {customerConfig?.delivery?.afterHoursFee
              ? ` (после ${customerConfig.delivery.afterHoursStart || '21:00'} +${customerConfig.delivery.afterHoursFee}, согласуем заранее).`
              : '.'}
          </div>
          <div>• Среднее время доставки: {customerConfig?.delivery?.avgTime || '1–2 часа'}.</div>
        </div>
      </div>

      {/* Дата и время доставки/самовывоза */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Дата и время
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.deliveryAsReady !== false}
            onChange={(e) => {
              const checked = e.target.checked;
              const today = new Date().toISOString().slice(0, 10);
              const minTime = getMinDeliveryTime(today);
              handleInputChange('deliveryAsReady', checked);
              if (!checked) {
                const next = { ...formData, deliveryAsReady: false, deliveryDate: today, deliveryTime: minTime || '12:00' };
                setFormData(next);
                saveFormData(next);
              }
            }}
            style={{ width: '20px', height: '20px' }}
          />
          <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>Доставка по готовности</span>
        </label>
        {formData.deliveryAsReady !== false ? (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Доставим по готовности букета, без фиксированного времени.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Дата <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                value={formData.deliveryDate || ''}
                onChange={(e) => {
                  const date = e.target.value;
                  const minT = getMinDeliveryTime(date);
                  let time = formData.deliveryTime || minT || '12:00';
                  if (date && minT && time < minT) time = minT;
                  const next = { ...formData, deliveryDate: date, deliveryTime: time };
                  setFormData(next);
                  saveFormData(next);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: errors.deliveryDate ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                {(() => {
                  const today = new Date();
                  const options: { value: string; label: string }[] = [];
                  for (let i = 0; i < 7; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    const value = d.toISOString().slice(0, 10);
                    const label = i === 0 ? `Сегодня, ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : i === 1 ? `Завтра, ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
                    options.push({ value, label });
                  }
                  return options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>);
                })()}
              </select>
              {errors.deliveryDate && (
                <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.deliveryDate}</p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Время <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                value={formData.deliveryTime || ''}
                onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: errors.deliveryTime ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                {(() => {
                  const minTime = getMinDeliveryTime(formData.deliveryDate);
                  const slots: string[] = [];
                  for (let h = 0; h < 24; h++) {
                    for (let m = 0; m < 60; m += 15) {
                      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      if (minTime && formData.deliveryDate) {
                        const isToday = (() => {
                          const today = new Date().toISOString().slice(0, 10);
                          return formData.deliveryDate === today;
                        })();
                        if (isToday && t < minTime) continue;
                      }
                      slots.push(t);
                    }
                  }
                  return slots.map((s) => <option key={s} value={s}>{s}</option>);
                })()}
              </select>
              {errors.deliveryTime && (
                <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.deliveryTime}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Получатель */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Данные получателя
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Имя получателя <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.recipientName || ''}
              onChange={(e) => handleInputChange('recipientName', e.target.value)}
              placeholder="Кому доставить букет"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.recipientName ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                fontSize: '16px',
                boxSizing: 'border-box',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)'
              }}
            />
            {errors.recipientName && (
              <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.recipientName}</p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Телефон получателя <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="tel"
              value={formData.recipientPhone || ''}
              onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
              placeholder="+7 (999) 123-45-67"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.recipientPhone ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
                fontSize: '16px',
                boxSizing: 'border-box',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)'
              }}
            />
            {errors.recipientPhone && (
              <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.recipientPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Открытка */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid var(--border-light)'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Текст открытки
        </h2>
        <textarea
          value={formData.cardText || ''}
          onChange={(e) => handleInputChange('cardText', e.target.value)}
          placeholder="Что написать в открытке"
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
          border: errors.cardText ? '2px solid var(--color-error)' : '1px solid var(--border-soft)',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-surface)'
          }}
        />
        {errors.cardText && (
          <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '4px' }}>{errors.cardText}</p>
        )}
      </div>

      {/* Комментарий */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid var(--border-light)'
      }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
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
          border: '1px solid var(--border-soft)',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-surface)'
          }}
        />
      </div>

      {/* Бонусы */}
      {me && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid var(--border-light)',
          }}
        >
          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Бонусы
          </h2>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Баланс: <strong>{bonusBalance.toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Категория: <strong>{me.bonus.tier.title}</strong> · Кэшбек: <strong>{me.bonus.cashbackPercent}%</strong>
          </div>

          {maxBonusToUse > 0 ? (
            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: isOrderLocked ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(formData.useBonuses)}
                disabled={isOrderLocked}
                onChange={(e) => handleInputChange('useBonuses', e.target.checked)}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Использовать бонусы (до {maxBonusToUse.toLocaleString('ru-RU')} ₽)
              </span>
            </label>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Бонусов для списания пока нет.
            </div>
          )}

          {Boolean(formData.useBonuses) && maxBonusToUse > 0 && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Списываем: <strong>{maxBonusToUse.toLocaleString('ru-RU')} ₽</strong>
            </div>
          )}
        </div>
      )}

      {/* Итого */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>Итого:</span>
          <span style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'var(--color-accent)'
          }}>
            {displayedTotal.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
      <button
        onClick={handleProceedToPayment}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: loading ? 'var(--bg-disabled)' : 'var(--color-accent)',
          color: 'var(--text-on-accent)',
          fontSize: '16px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        Оформить заказ
      </button>
      </>
      )}

      {paymentStep === 'payment' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setPaymentStep('form')}
              disabled={loading || isOrderLocked}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--color-accent)',
                fontSize: '14px',
                cursor: loading || isOrderLocked ? 'not-allowed' : 'pointer'
              }}
            >
              ← Вернуться к данным заказа
            </button>
          </div>

          {/* Сумма и бонусы в начале шага оплаты */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: orderBonusUsed > 0 || (orderTotal != null && orderTotal > 0) ? '12px' : 0
            }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Сумма к оплате:</span>
              <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                {(orderTotal != null ? orderTotal : displayedTotal).toLocaleString('ru-RU')} ₽
              </span>
            </div>
            {orderBonusUsed > 0 ? (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Списано бонусами: <strong style={{ color: 'var(--text-primary)' }}>{orderBonusUsed.toLocaleString('ru-RU')} ₽</strong>
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                После подтверждения заказа начислится: <strong style={{ color: 'var(--text-primary)' }}>
                  ~{Math.max(0, Math.floor((Number(orderTotal ?? displayedTotal) * Number(me?.bonus?.cashbackPercent ?? 0)) / 100))} ₽
                </strong> бонусами (кэшбек {me?.bonus?.cashbackPercent ?? 0}%)
              </div>
            )}
          </div>

          {/* Способ оплаты */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid var(--border-light)'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Способ оплаты
            </h2>

            {!isOrderLocked && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {paymentOptions.map((payment) => (
                  <label
                    key={payment.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      border: formData.paymentType === payment.value ? '2px solid var(--color-accent)' : '1px solid var(--border-soft)',
                      cursor: payment.disabled ? 'not-allowed' : 'pointer',
                      opacity: payment.disabled ? 0.6 : 1,
                      backgroundColor: formData.paymentType === payment.value ? 'var(--bg-secondary)' : 'var(--bg-surface)'
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={payment.value}
                      checked={formData.paymentType === payment.value}
                      disabled={payment.disabled || isOrderLocked}
                      onChange={() => handleInputChange('paymentType', payment.value)}
                      style={{ marginRight: '12px', width: '20px', height: '20px' }}
                    />
                    <span style={{ marginRight: '8px', fontSize: '20px' }}>{payment.icon}</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{payment.label}</span>
                  </label>
                ))}
              </div>
            )}
            {isOrderLocked && (
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Выбранный способ оплаты: <strong>{selectedPaymentLabel || '—'}</strong>
              </div>
            )}

            {formData.paymentType === 'card_requisites' && (
              <div style={{
                marginTop: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--color-accent-transparent)'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {customerConfig?.cardRequisites.title || 'Оплата по номеру телефона'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {requisitesMainValue && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {requisitesMainLabel}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleCopyRequisite(requisitesMainValue, requisitesMainLabel)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          {requisitesMainValue}
                        </button>
                        <button
                          onClick={() => handleCopyRequisite(requisitesMainValue, requisitesMainLabel)}
                          aria-label={`Скопировать ${requisitesMainLabel.toLowerCase()}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-soft)',
                            backgroundColor: 'var(--bg-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}
                  {requisitesOtherDetails.length
                    ? requisitesOtherDetails.map((line) => (
                        <div key={line}>{line}</div>
                      ))
                    : !requisitesMainValue && <div>Реквизиты будут добавлены позже.</div>}
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {customerConfig?.cardRequisites.note || 'После оплаты пришлите чек, пожалуйста.'}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Загрузите чек или скриншот оплаты
                  </div>
                  <label style={{ display: 'inline-block', marginBottom: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleReceiptChange(e.target.files?.[0])}
                      disabled={receiptUploading}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-soft)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: receiptUploading ? 'not-allowed' : 'pointer'
                    }}>
                      Выбрать файл
                    </span>
                  </label>
                  {receiptPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <img
                        src={receiptPreview}
                        alt="Чек"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                      />
                      {receiptFileName && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {receiptFileName}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleUploadReceipt}
                    disabled={receiptUploading || !receiptPreview}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-soft)',
                      backgroundColor: receiptUploading || !receiptPreview ? 'var(--bg-disabled)' : 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: receiptUploading || !receiptPreview ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {receiptUploading ? 'Отправляем чек...' : 'Отправить чек'}
                  </button>
                  {receiptSent && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Чек отправлен менеджеру.
                    </div>
                  )}
                  {receiptError && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-error)' }}>
                      {receiptError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={!receiptSent}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: receiptSent ? 'var(--color-accent)' : 'var(--bg-disabled)',
                      color: receiptSent ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: receiptSent ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Завершить заказ
                  </button>
                </div>
              </div>
            )}

            {formData.paymentType === 'sbp_qr' && (
              <div style={{
                marginTop: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--color-accent-transparent)'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Оплата по QR-коду СБП
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {customerConfig?.sbpQr?.note || 'Отсканируйте QR и оплатите, затем загрузите чек об оплате.'}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Загрузите чек или скриншот оплаты
                  </div>
                  <label style={{ display: 'inline-block', marginBottom: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleReceiptChange(e.target.files?.[0])}
                      disabled={receiptUploading}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-soft)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: receiptUploading ? 'not-allowed' : 'pointer'
                    }}>
                      Выбрать файл
                    </span>
                  </label>
                  {receiptPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <img
                        src={receiptPreview}
                        alt="Чек"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                      />
                      {receiptFileName && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {receiptFileName}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleUploadReceipt}
                    disabled={receiptUploading || !receiptPreview}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-soft)',
                      backgroundColor: receiptUploading || !receiptPreview ? 'var(--bg-disabled)' : 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: receiptUploading || !receiptPreview ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {receiptUploading ? 'Отправляем чек...' : 'Отправить чек'}
                  </button>
                  {receiptSent && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Чек отправлен менеджеру.
                    </div>
                  )}
                  {receiptError && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-error)' }}>
                      {receiptError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={!receiptSent}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: receiptSent ? 'var(--color-accent)' : 'var(--bg-disabled)',
                      color: receiptSent ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: receiptSent ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Завершить заказ
                  </button>
                </div>
              </div>
            )}

            {orderId && (
              <div style={{
                marginTop: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {orderNumber ? `Заказ #${orderNumber}` : 'Заказ отправлен'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {statusMessage || 'Платеж обрабатывается'}
                </div>
                {paymentStatus === 'rejected' && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Если оплата была проведена, свяжитесь с менеджером: {customerConfig?.managerPhone || '+7 900 000-00-00'}
                  </div>
                )}
              </div>
            )}

            {/* Отменить заказ — внизу шага оплаты */}
            {orderId && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelOrderLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-soft)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: cancelOrderLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cancelOrderLoading ? 'Отмена заказа...' : 'Отменить заказ'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      </div>
      <AppFooter />
      <BottomNavigation />

      {/* Модальное окно: заказ успешно завершён */}
      {showThankYouModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(65, 65, 67, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(215, 149, 176, 0.3)',
              position: 'relative',
              animation: 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: 'scale(1)',
              border: '1px solid rgba(215, 149, 176, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(215, 149, 176, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '48px',
                lineHeight: '1'
              }}
            >
              🌺
            </div>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                textAlign: 'center',
                margin: '0 0 12px',
                letterSpacing: '-0.02em'
              }}
            >
              Заказ успешно завершён
            </h2>

            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: '1.6',
                margin: '0 0 32px',
                padding: '0 8px'
              }}
            >
              После подтверждения оплаты вам придёт уведомление. Статус заказа можно посмотреть в разделе «Мои заказы» в профиле.
            </p>

            <button
              onClick={() => {
                setShowThankYouModal(false);
                navigate('/catalog');
              }}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-on-accent)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(215, 149, 176, 0.3)',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(215, 149, 176, 0.25)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(215, 149, 176, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(215, 149, 176, 0.3)';
              }}
            >
              Перейти в каталог
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

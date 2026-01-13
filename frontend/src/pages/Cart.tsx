import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } = useCartStore();

  useEffect(() => {
    if (items.length > 0) {
      const total = getTotal();
      WebApp.MainButton.setText(`Оформить заказ - ${total.toLocaleString('ru-RU')} ₽`);
      WebApp.MainButton.show();
      WebApp.MainButton.onClick(() => {
        navigate('/checkout', { replace: false });
      });
    } else {
      WebApp.MainButton.hide();
    }

    return () => {
      WebApp.MainButton.hide();
    };
  }, [items, getTotal, navigate]);

  const handleRemoveItem = (productId: number) => {
    if (window.confirm('Удалить товар из корзины?')) {
      removeItem(productId);
    }
  };

  const handleIncreaseQuantity = (productId: number, currentQuantity: number) => {
    updateQuantity(productId, currentQuantity + 1);
  };

  const handleDecreaseQuantity = (productId: number, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(productId, currentQuantity - 1);
    } else {
      handleRemoveItem(productId);
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
          Корзина
        </div>
      </div>

      <div className="container" style={{ paddingTop: '20px', paddingBottom: '100px' }}>
      
      {items.length === 0 ? (
        <div style={{ 
          padding: '60px 20px',
          textAlign: 'center',
          color: '#495057'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
          <p style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>
            Корзина пуста
          </p>
          <p style={{ marginBottom: '24px', fontSize: '14px' }}>
            Добавьте товары из каталога
          </p>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.preventDefault();
              navigate('/catalog', { replace: false });
            }}
            style={{ width: '100%' }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <div>
          {/* Список товаров в корзине */}
          <div style={{ marginBottom: '24px' }}>
            {items.map((item) => (
              <div
                key={item.productId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '1px solid #DEE2E6',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                {/* Изображение товара */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productName}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=🌺';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#F8F9FA',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    flexShrink: 0
                  }}>
                    🌺
                  </div>
                )}

                {/* Информация о товаре */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '16px',
                    marginBottom: '8px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    color: '#2D1B2E'
                  }}>
                    {item.productName}
                  </h3>
                  
                  <p style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#FFCADC',
                    marginBottom: '12px'
                  }}>
                    {item.price.toLocaleString('ru-RU')} ₽
                  </p>

                  {/* Управление количеством */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <button
                        onClick={() => handleDecreaseQuantity(item.productId, item.quantity)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #DEE2E6',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        −
                      </button>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        minWidth: '24px',
                        textAlign: 'center',
                        color: '#2D1B2E'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncreaseQuantity(item.productId, item.quantity)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #DEE2E6',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #DC3545',
                        backgroundColor: '#FFFFFF',
                        color: '#DC3545',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Удалить
                    </button>
                  </div>

                  <p style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginTop: '8px',
                    color: '#212529'
                  }}>
                    Итого: {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Итоговая сумма */}
          <div style={{
            backgroundColor: '#F8F9FA',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px', color: '#2D1B2E' }}>Товаров:</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#2D1B2E' }}>{getItemCount()} шт.</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid #DEE2E6'
            }}>
              <span style={{ fontSize: '20px', fontWeight: '600', color: '#2D1B2E' }}>Итого:</span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 'bold',
                color: '#FFCADC'
              }}>
                {getTotal().toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          {/* Кнопка очистки корзины */}
          <button
            onClick={() => {
              if (window.confirm('Очистить корзину?')) {
                clearCart();
              }
            }}
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            Очистить корзину
          </button>
        </div>
      )}
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

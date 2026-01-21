import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';
import { resolveImageUrl } from '../utils/image';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } = useCartStore();

  useEffect(() => {
    WebApp.MainButton.hide();
    return () => {
      WebApp.MainButton.hide();
    };
  }, []);

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
      backgroundColor: 'var(--bg-main)',
      paddingBottom: '120px'
    }}>
      {/* Заголовок с кнопкой назад */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
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
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{ fontSize: '17px', fontWeight: '600', flex: 1 }}>
          Корзина
        </div>
      </div>

      <div className="container" style={{ paddingTop: '20px' }}>
      
      {items.length === 0 ? (
        <div style={{ 
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
          <p style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)' }}>
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
            style={{ width: '100%', padding: '14px' }}
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
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '12px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                {/* Изображение товара */}
                {item.image ? (
                  <img
                    src={resolveImageUrl(item.image)}
                    alt={item.productName}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
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
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
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
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{
                    fontSize: '15px',
                    marginBottom: '4px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    color: 'var(--text-primary)'
                  }}>
                    {item.productName}
                  </h3>
                  
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: 'auto'
                  }}>
                    {item.price.toLocaleString('ru-RU')} ₽
                  </p>

                  {/* Управление количеством */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px'
                    }}>
                      <button
                        onClick={() => handleDecreaseQuantity(item.productId, item.quantity)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        −
                      </button>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '20px',
                        textAlign: 'center',
                        color: 'var(--text-primary)'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncreaseQuantity(item.productId, item.quantity)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Итоговая сумма */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Товаров:</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{getItemCount()} шт.</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Итого:</span>
              <span style={{ 
                fontSize: '22px', 
                fontWeight: '800',
                color: 'var(--text-primary)'
              }}>
                {getTotal().toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout', { replace: false })}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginBottom: '12px' }}
          >
            Оформить заказ
          </button>

          {/* Кнопка очистки корзины */}
          <button
            onClick={() => {
              if (window.confirm('Очистить корзину?')) {
                clearCart();
              }
            }}
            className="btn"
            style={{ 
              width: '100%', 
              marginBottom: '12px',
              backgroundColor: 'transparent',
              color: 'var(--text-tertiary)',
              fontSize: '14px'
            }}
          >
            Очистить корзину
          </button>
        </div>
      )}
      </div>

      <AppFooter />
      <BottomNavigation />
    </div>
  );
}

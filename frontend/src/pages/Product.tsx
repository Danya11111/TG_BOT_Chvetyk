import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useProductStore } from '../store/product.store';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();
  const { product, loading, error, fetchProduct, reset } = useProductStore();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      try {
        await fetchProduct(parseInt(id, 10));
      } catch (err: any) {
        console.error('Error loading product:', err);
      }
    };

    loadProduct();
    return () => reset();
  }, [id, fetchProduct, reset]);

  useEffect(() => {
    if (product) {
      WebApp.MainButton.setText(`Добавить в корзину - ${(product.price * quantity).toLocaleString('ru-RU')} ₽`);
      WebApp.MainButton.show();
      WebApp.MainButton.onClick(() => {
        if (product) {
          addItem({
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity,
            image: product.images?.[0],
          });
          WebApp.showAlert(`Товар "${product.name}" добавлен в корзину!`);
          navigate('/cart');
        }
      });
    }
    
    return () => {
      WebApp.MainButton.hide();
    };
  }, [product, quantity, addItem, navigate]);

  const increaseQuantity = () => {
    const maxQuantity = product?.stock_quantity || 99;
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="loading">Загрузка товара...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="error">{error || 'Товар не найден'}</div>
        <button
          className="btn btn-secondary"
          onClick={(e) => {
            e.preventDefault();
            navigate('/catalog', { replace: false });
          }}
          style={{ marginTop: '16px', width: '100%' }}
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFFFF',
      paddingBottom: '80px'
    }}>
      {/* Заголовок с кнопкой назад */}
      <div style={{
        backgroundColor: '#FFCADC',
        padding: '12px 16px',
        color: '#2D1B2E',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100
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
          Товар
        </div>
      </div>

      {/* Изображение товара */}
      <div style={{ 
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#F8F9FA',
        position: 'relative'
      }}>
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x600?text=Цветы';
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '120px'
          }}>
            🌺
          </div>
        )}
      </div>

      <div className="container" style={{ paddingTop: '20px' }}>
        {/* Название и цена */}
        <h1 style={{ 
          fontSize: '24px', 
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          {product.name}
        </h1>

        {product.category_name && (
          <p style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '16px'
          }}>
            {product.category_name}
          </p>
        )}

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <p style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: '#FF6B9D',
            margin: 0
          }}>
            {product.price.toLocaleString('ru-RU')} ₽
          </p>
          {product.old_price && product.old_price > product.price && (
            <p style={{ 
              fontSize: '18px', 
              color: '#495057',
              textDecoration: 'line-through',
              margin: 0
            }}>
              {product.old_price.toLocaleString('ru-RU')} ₽
            </p>
          )}
        </div>

        {/* Описание */}
        {product.description && (
          <div style={{ 
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#F8F9FA',
            borderRadius: '12px'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Описание
            </h2>
            <p style={{ 
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#212529',
              whiteSpace: 'pre-wrap'
            }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Наличие */}
        <div style={{ marginBottom: '24px' }}>
          {product.in_stock ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#D4EDDA',
              color: '#155724',
              borderRadius: '20px',
              fontSize: '14px'
            }}>
              <span>✓</span>
              <span>В наличии</span>
              {product.stock_quantity && (
                <span>(осталось {product.stock_quantity} шт.)</span>
              )}
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#F8D7DA',
              color: '#721C24',
              borderRadius: '20px',
              fontSize: '14px'
            }}>
              <span>✗</span>
              <span>Нет в наличии</span>
            </div>
          )}
        </div>

        {/* Выбор количества */}
        {product.in_stock && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ 
              fontSize: '16px', 
              marginBottom: '12px',
              fontWeight: '500'
            }}>
              Количество:
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              width: 'fit-content'
            }}>
              <button
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #DEE2E6',
                  backgroundColor: quantity <= 1 ? '#F8F9FA' : '#FFFFFF',
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: quantity <= 1 ? '#6C757D' : '#212529'
                }}
              >
                −
              </button>
              <span style={{ 
                fontSize: '20px', 
                fontWeight: '600',
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {quantity}
              </span>
              <button
                onClick={increaseQuantity}
                disabled={quantity >= (product.stock_quantity || 99)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #DEE2E6',
                  backgroundColor: quantity >= (product.stock_quantity || 99) ? '#F8F9FA' : '#FFFFFF',
                  cursor: quantity >= (product.stock_quantity || 99) ? 'not-allowed' : 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: quantity >= (product.stock_quantity || 99) ? '#6C757D' : '#212529'
                }}
              >
                +
              </button>
            </div>
            <p style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              marginTop: '16px',
              color: '#FF6B9D'
            }}>
              Итого: {(product.price * quantity).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        )}

        {/* Дополнительная информация */}
        {product.article && (
          <div style={{
            padding: '12px',
            backgroundColor: '#F8F9FA',
            borderRadius: '8px',
            marginTop: '16px',
            fontSize: '14px',
            color: '#6C757D'
          }}>
            Артикул: {product.article}
          </div>
        )}
      </div>
    </div>
  );
}

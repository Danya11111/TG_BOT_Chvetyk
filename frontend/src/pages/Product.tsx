import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useProductStore } from '../store/product.store';
import { Button } from '../components/ui/Button';

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

  // Handle Telegram Main Button
  useEffect(() => {
    if (product) {
      WebApp.MainButton.setText(`Добавить в корзину • ${(product.price * quantity).toLocaleString('ru-RU')} ₽`);
      WebApp.MainButton.enable();
      WebApp.MainButton.show();
      
      const handleMainButtonClick = () => {
        addItem({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
          image: product.images?.[0],
        });
        WebApp.HapticFeedback.notificationOccurred('success');
        navigate('/cart');
      };

      WebApp.MainButton.onClick(handleMainButtonClick);

      return () => {
        WebApp.MainButton.offClick(handleMainButtonClick);
        WebApp.MainButton.hide();
      };
    }
  }, [product, quantity, addItem, navigate]);

  const increaseQuantity = () => {
    const maxQuantity = product?.stock_quantity || 99;
    if (quantity < maxQuantity) {
      setQuantity(q => q + 1);
      WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
      WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '20px' }}>
         <div style={{ aspectRatio: '1', borderRadius: '12px', marginBottom: '20px' }} className="skeleton" />
         <div style={{ height: '30px', width: '70%', marginBottom: '10px' }} className="skeleton" />
         <div style={{ height: '20px', width: '40%' }} className="skeleton" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ paddingTop: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🥀</div>
        <h2 className="text-h2" style={{ marginBottom: '10px' }}>Товар не найден</h2>
        <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Возможно, он был удален или перемещен.
        </p>
        <Button onClick={() => navigate('/catalog')}>
          Вернуться в каталог
        </Button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--background-color)',
      paddingBottom: '20px'
    }} className="fade-in">
      
      {/* Sticky Header with Back Button */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>

      {/* Main Image */}
      <div style={{ 
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#FFFFFF',
        marginTop: '-64px', /* Pull up behind header */
        zIndex: 1
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
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '80px',
            color: '#E0E0E0',
            backgroundColor: '#F0F2F5'
          }}>
            🌺
          </div>
        )}
      </div>

      {/* Content Container */}
      <div style={{
        position: 'relative',
        marginTop: '-20px',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        backgroundColor: 'var(--background-color)',
        padding: '24px 16px',
        zIndex: 2,
        boxShadow: '0 -10px 20px rgba(0,0,0,0.05)'
      }}>
        
        {/* Header Info */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <h1 className="text-h2" style={{ lineHeight: 1.2 }}>{product.name}</h1>
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary-color)' }}>
                 {product.price.toLocaleString('ru-RU')} ₽
               </div>
               {product.old_price && product.old_price > product.price && (
                 <div style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '14px' }}>
                   {product.old_price.toLocaleString('ru-RU')} ₽
                 </div>
               )}
            </div>
          </div>
          {product.category_name && (
            <span style={{ 
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              boxShadow: 'var(--shadow-sm)'
            }}>
              {product.category_name}
            </span>
          )}
        </div>

        {/* Quantity Selector */}
        {product.in_stock ? (
          <div style={{ 
            backgroundColor: 'var(--surface-color)', 
            padding: '16px', 
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span className="text-body" style={{ fontWeight: 500 }}>Количество</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={decreaseQuantity}
                className="btn btn-secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px' }}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span style={{ fontSize: '18px', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button 
                onClick={increaseQuantity}
                className="btn btn-secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px' }}
                disabled={quantity >= (product.stock_quantity || 99)}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFF5F5',
            color: 'var(--error-color)',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
            fontWeight: 500
          }}>
            Товара временно нет в наличии
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="text-h3" style={{ marginBottom: '12px' }}>Описание</h3>
            <p className="text-body" style={{ 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Attributes (if any) */}
        {product.article && (
           <div style={{ 
             marginTop: '32px', 
             paddingTop: '16px', 
             borderTop: '1px solid var(--surface-secondary)' 
           }}>
             <p className="text-caption">Артикул: {product.article}</p>
           </div>
        )}
      </div>
    </div>
  );
}

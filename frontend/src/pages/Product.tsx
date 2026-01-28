import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useProductStore } from '../store/product.store';
import { Button } from '../components/ui/Button';
import { resolveImageUrl } from '../utils/image';
import { formatProductTitle } from '../utils/product-title';
import { formatPrice } from '../utils/price';
import './Product.css';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { addItem } = useCartStore();
  const { product, loading, error, fetchProduct, reset } = useProductStore();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        await fetchProduct(parseInt(id, 10));
      } catch (err: unknown) {
        console.error('Error loading product:', err);
      }
    };
    loadProduct();
    return () => reset();
  }, [id, fetchProduct, reset]);

  // Hide Telegram Main Button on this page
  useEffect(() => {
    WebApp.MainButton.hide();
    return () => {
      WebApp.MainButton.hide();
    };
  }, []);

  const attributes = product?.attributes as Record<string, unknown> | undefined;
  const composition =
    typeof (attributes as { composition?: unknown } | undefined)?.composition === 'string'
      ? (attributes as { composition: string }).composition
      : null;
  const extraImages = attributes?.images;
  const productImages = [
    ...(product?.images || []),
    ...(Array.isArray(extraImages) ? extraImages : []),
    ...(typeof extraImages === 'string' ? [extraImages] : []),
    ...(typeof attributes?.image === 'string' ? [attributes.image] : []),
    ...(typeof attributes?.imageUrl === 'string' ? [attributes.imageUrl] : []),
  ]
    .map((image) => (typeof image === 'string' ? resolveImageUrl(image) : ''))
    .filter((image) => Boolean(image));
  const hasImages = productImages.length > 0;
  const currentImage = hasImages ? productImages[activeImageIndex] : '';

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  const handleAddToCart = () => {
    if (!product || !product.in_stock) return;
    
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
      backgroundColor: 'var(--bg-main)',
      paddingBottom: '20px'
    }} className="fade-in">
      
      {/* Header with Back Button */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface)',
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
      <div className="product-hero">
        {hasImages ? (
          <img
            src={currentImage}
            alt={product.name}
            className="product-hero__image"
            onClick={() => setIsViewerOpen(true)}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '80px',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--bg-secondary)'
          }}>
            🌺
          </div>
        )}
        {hasImages && productImages.length > 1 && (
          <>
            <button
              className="product-hero__nav product-hero__nav--prev"
              onClick={() =>
                setActiveImageIndex((prev) =>
                  prev === 0 ? productImages.length - 1 : prev - 1
                )
              }
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              className="product-hero__nav product-hero__nav--next"
              onClick={() =>
                setActiveImageIndex((prev) =>
                  prev === productImages.length - 1 ? 0 : prev + 1
                )
              }
              aria-label="Следующее фото"
            >
              ›
            </button>
            <div className="product-hero__dots">
              {productImages.map((_, index) => (
                <span
                  key={`dot-${index}`}
                  className={`product-hero__dot ${index === activeImageIndex ? 'product-hero__dot--active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content Container */}
      <div style={{
        position: 'relative',
        marginTop: '16px',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        backgroundColor: 'var(--bg-main)',
        padding: '24px 16px',
        zIndex: 2,
        boxShadow: 'var(--shadow-md)'
      }}>
        
        {/* Header Info */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1 className="text-h2" style={{ lineHeight: 1.2 }}>
              {formatProductTitle(product.name) || product.name}
            </h1>
            <div style={{ textAlign: 'right', width: '100%' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-accent)' }}>
                {formatPrice(product.price)} ₽
              </div>
              {product.old_price && product.old_price > product.price && (
                <div style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {formatPrice(product.old_price)} ₽
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
              backgroundColor: 'var(--bg-secondary)',
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
            backgroundColor: 'var(--bg-secondary)', 
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
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--color-error)',
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
              {String(product.description)}
            </p>
          </div>
        )}

        {/* Composition */}
        {composition && (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="text-h3" style={{ marginBottom: '12px' }}>Состав</h3>
            <p className="text-body" style={{ 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {composition}
            </p>
          </div>
        )}

        {/* Add to Cart Button - Integrated in content */}
        {product.in_stock && (
          <Button
            onClick={handleAddToCart}
            variant="primary"
            size="lg"
            fullWidth
            style={{
              marginBottom: '24px',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            Добавить в корзину • {formatPrice(product.price * quantity)} ₽
          </Button>
        )}

        {/* Attributes (if any) */}
        {product.article && (
           <div style={{ 
             marginTop: '32px', 
             paddingTop: '16px', 
             borderTop: '1px solid var(--border-light)' 
           }}>
             <p className="text-caption">Артикул: {product.article}</p>
           </div>
        )}
      </div>

      {isViewerOpen && hasImages && (
        <div className="image-modal" onClick={() => setIsViewerOpen(false)}>
          <div className="image-modal__content" onClick={(event) => event.stopPropagation()}>
            <img src={currentImage} alt={product.name} className="image-modal__image" />
            <button className="image-modal__close" onClick={() => setIsViewerOpen(false)} aria-label="Закрыть">
              ×
            </button>
            {productImages.length > 1 && (
              <>
                <button
                  className="image-modal__nav image-modal__nav--prev"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === 0 ? productImages.length - 1 : prev - 1
                    )
                  }
                  aria-label="Предыдущее фото"
                >
                  ‹
                </button>
                <button
                  className="image-modal__nav image-modal__nav--next"
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === productImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  aria-label="Следующее фото"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

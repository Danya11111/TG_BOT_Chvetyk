import { MouseEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useCatalogStore } from '../store/catalog.store';
import { Product } from '../types/catalog';

export default function CatalogPage() {
  const navigate = useNavigate();

  const {
    categories,
    loading,
    error,
    selectedCategoryId,
    searchQuery,
    fetchCategories,
    fetchProducts,
    setCategory,
    setSearchQuery,
    getFilteredProducts,
  } = useCatalogStore();

  useEffect(() => {
    WebApp.MainButton.hide();
    
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId, fetchProducts]);

  // Получаем функции из store
  const addToCart = useCartStore((state) => state.addItem);
  const cartTotal = useCartStore((state) => state.getTotal());
  const cartItemsCount = useCartStore((state) => state.getItemCount());

  const filteredProducts = getFilteredProducts();

  const handleAddToCart = (product: Product, e: MouseEvent) => {
    e.stopPropagation();
    addToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        color: '#212529'
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '24px',
          backgroundColor: '#FFFFFF',
          color: '#D6336C',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFFFF',
      paddingBottom: '60px' // Место для нижней навигации (уменьшено)
    }}>
      {/* Заголовок с поиском */}
      <div style={{
        backgroundColor: '#FFCADC',
        padding: '12px 16px',
        color: '#2D1B2E'
      }}>
        {/* Поиск */}
        <input
          type="text"
          placeholder="Поиск по товарам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            color: '#2D1B2E'
          }}
        />
      </div>

      {/* Категории */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F5F5F5',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => setCategory(undefined)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: selectedCategoryId === undefined ? 'none' : '1px solid #FFCADC',
            backgroundColor: selectedCategoryId === undefined ? '#FFCADC' : '#FFFFFF',
            color: selectedCategoryId === undefined ? '#2D1B2E' : '#2D1B2E',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ВСЕ
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setCategory(category.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategoryId === category.id ? 'none' : '1px solid #FFCADC',
              backgroundColor: selectedCategoryId === category.id ? '#FFCADC' : '#FFFFFF',
              color: selectedCategoryId === category.id ? '#2D1B2E' : '#2D1B2E',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Товары */}
      {filteredProducts.length === 0 && !loading ? (
        <div style={{ 
          padding: '40px 20px',
          textAlign: 'center',
          color: '#495057',
          backgroundColor: '#FFFFFF'
        }}>
          <p style={{ fontSize: '16px' }}>Товары не найдены</p>
          {searchQuery && (
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Попробуйте изменить поисковый запрос
            </p>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          padding: '16px'
        }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/product/${product.id}`, { replace: false });
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '0',
                border: '1px solid #E0E0E0',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Изображение товара */}
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Цветы';
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px'
                }}>
                  🌺
                </div>
              )}
              
              {/* Информация о товаре */}
              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ 
                  fontSize: '14px', 
                  marginBottom: '8px',
                  fontWeight: '400',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '40px',
                  color: '#212529'
                }}>
                  {product.name}
                </h3>
                
                <div style={{ 
                  marginTop: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <p style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: '#212529',
                    margin: 0
                  }}>
                    {product.price.toLocaleString('ru-RU')} ₽
                  </p>
                  
                    <button
                    onClick={(e) => handleAddToCart(product, e)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#FFCADC',
                      color: '#2D1B2E',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Корзина
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Плавающая кнопка корзины с суммой */}
      {cartItemsCount > 0 && (
        <div
          onClick={(e) => {
            e.preventDefault();
            navigate('/cart', { replace: false });
          }}
          style={{
            position: 'fixed',
            bottom: '60px', // Выше нижней навигации (уменьшено)
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
            style={{ color: '#2D1B2E' }}
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>{cartTotal.toLocaleString('ru-RU')} ₽</span>
        </div>
      )}

      {/* Нижняя навигация - уменьшенная */}
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
            style={{ color: '#2D1B2E' }}
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
            style={{ color: '#2D1B2E' }}
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
            style={{ color: '#2D1B2E' }}
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
            style={{ color: '#2D1B2E' }}
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
        @cvetochnyj21_bot
      </div>
    </div>
  );
}

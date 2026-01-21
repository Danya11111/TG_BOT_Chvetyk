import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useCartStore } from '../store/cart.store';
import { useCatalogStore } from '../store/catalog.store';
import { Product } from '../types/catalog';
import { ProductCard } from '../components/ProductCard';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppFooter } from '../components/AppFooter';
import { useCustomerConfig } from '../hooks/useCustomerConfig';
import clsx from 'clsx';
import './Catalog.css';

export default function CatalogPage() {
  const navigate = useNavigate();
  const { config } = useCustomerConfig();

  const {
    categories,
    loading,
    loadingMore,
    error,
    selectedCategoryId,
    searchQuery,
    fetchCategories,
    fetchProducts,
    fetchMoreProducts,
    setCategory,
    setSearchQuery,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
    setPriceRange,
    setInStockOnly,
    setSort,
    products,
    hasMore,
  } = useCatalogStore();

  useEffect(() => {
    // Use theme colors for Telegram UI
    const getThemeColor = (varName: string, fallback: `#${string}`): `#${string}` => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (value && value.startsWith('#')) {
        return value as `#${string}`;
      }
      return fallback;
    };
    const bgColor = getThemeColor('--bg-main', '#FFFFFF');
    WebApp.setBackgroundColor(bgColor);
    WebApp.setHeaderColor(bgColor);
    
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId, searchQuery, minPrice, maxPrice, inStockOnly, sort, fetchProducts]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMoreProducts();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchMoreProducts]);

  // Cart logic
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getTotal());
  const cartItemsCount = useCartStore((state) => state.getItemCount());

  const getProductQuantity = (productId: number) => {
    const item = cartItems.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
    });
    // Visual feedback handled in component
  };

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  // Loading Skeleton
  if (loading && !products.length) {
    return (
      <div className="catalog-page">
        <div className="container" style={{ paddingTop: '16px' }}>
          <div className="skeleton search-skeleton" />
          <div className="skeleton categories-skeleton" />
          <div className="catalog-skeleton-grid">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="skeleton catalog-skeleton-item" />
             ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-error-container">
        <div className="catalog-error-content">
          <p>Не удалось загрузить товары</p>
          <p style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {error}
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page" style={{ paddingBottom: '120px' }}>
      {/* Header / Search */}
      <div className="catalog-header">
        <div className="catalog-brand">
          <img
            src="/brand-logo.png"
            alt={config?.brand?.displayName || 'FlowersStudio'}
            className="catalog-brand__logo"
          />
          <div className="catalog-brand__name">
            {config?.brand?.displayName || 'FlowersStudio'}
          </div>
        </div>
        <div className="search-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            placeholder="Поиск букетов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="catalog-search"
          />
        </div>
      </div>

      {/* Categories (Chips) */}
      <div className="catalog-categories no-scrollbar">
        <button
          onClick={() => setCategory(undefined)}
          className={clsx('catalog-chip', selectedCategoryId === undefined && 'catalog-chip--active')}
        >
          Все
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setCategory(category.id)}
            className={clsx('catalog-chip', selectedCategoryId === category.id && 'catalog-chip--active')}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="catalog-filters">
        <div>
          <div className="catalog-filter-label">Цена от</div>
          <input
            type="number"
            min={0}
            className="catalog-filter-input"
            value={minPrice ?? ''}
            onChange={(e) => setPriceRange(e.target.value ? Number(e.target.value) : undefined, maxPrice)}
            placeholder="от"
          />
        </div>
        <div>
          <div className="catalog-filter-label">Цена до</div>
          <input
            type="number"
            min={0}
            className="catalog-filter-input"
            value={maxPrice ?? ''}
            onChange={(e) => setPriceRange(minPrice, e.target.value ? Number(e.target.value) : undefined)}
            placeholder="до"
          />
        </div>
        <label className="catalog-filter-checkbox">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          В наличии
        </label>
        <div>
          <div className="catalog-filter-label">Сортировка</div>
          <select
            className="catalog-filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container catalog-container">
        {products.length === 0 ? (
          <div className="catalog-empty">
            <div className="catalog-empty__icon">🥀</div>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить запрос</p>
          </div>
        ) : (
          <>
            <div className="catalog-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                  onAdd={(e) => handleAddToCart(product, e)}
                  countInCart={getProductQuantity(product.id)}
                />
              ))}
            </div>
            <div ref={loadMoreRef} style={{ height: '1px' }} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)' }}>
                Загружаем ещё товары...
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-tertiary)' }}>
                Больше товаров нет
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartItemsCount > 0 && (
        <div className="floating-cart-wrapper">
          <button
            onClick={() => navigate('/cart')}
            className="floating-cart"
          >
            <span className="floating-cart__label">Корзина</span>
            <div className="floating-cart__info">
              <span className="floating-cart__count">{cartItemsCount}</span>
              <span className="floating-cart__sep">·</span>
              <span className="floating-cart__price">{cartTotal.toLocaleString('ru-RU')} ₽</span>
            </div>
          </button>
        </div>
      )}

      <AppFooter />
      <BottomNavigation />
    </div>
  );
}

import React, { MouseEvent, useState, useEffect } from 'react';
import { Product } from '../types/catalog';
import './ProductCard.css';
import WebApp from '@twa-dev/sdk';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onAdd: (e: MouseEvent) => void;
  countInCart?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onAdd, countInCart = 0 }) => {
  const [isAddedAnim, setIsAddedAnim] = useState(false);

  const handleAddClick = (e: MouseEvent) => {
    onAdd(e);
    setIsAddedAnim(true);
    WebApp.HapticFeedback.impactOccurred('medium');
  };

  useEffect(() => {
    if (isAddedAnim) {
      const timer = setTimeout(() => setIsAddedAnim(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAddedAnim]);

  return (
    <div className="product-card fade-in" onClick={onClick}>
      {/* Image Container */}
      <div className="product-card__image-container">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="product-card__image"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=🌺';
            }}
          />
        ) : (
          <div className="product-card__placeholder">
            🌺
          </div>
        )}

        {/* Status Badges */}
        {!product.in_stock ? (
          <div className="product-card__badge product-card__badge--sold">
            <span>Продано</span>
          </div>
        ) : (
          /* Example: We could add 'New' or 'Hit' badges here based on props later */
          null
        )}
        
        {/* Quantity Badge on Image (if in cart) */}
        {countInCart > 0 && (
          <div className="product-card__qty-badge scale-in">
            {countInCart}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="product-card__content">
        <div className="product-card__info">
          <div className="product-card__price-row">
             <span className="product-card__price">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="product-card__old-price">
                {product.old_price.toLocaleString('ru-RU')}
              </span>
            )}
          </div>
          <h3 className="product-card__title">
            {product.name}
          </h3>
        </div>

        <button
          className={`product-card__add-btn ${isAddedAnim ? 'clicked' : ''}`}
          onClick={handleAddClick}
          disabled={!product.in_stock}
          aria-label="Добавить в корзину"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

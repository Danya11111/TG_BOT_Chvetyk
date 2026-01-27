import React, { MouseEvent, useState, useEffect } from 'react';
import { Product } from '../types/catalog';
import './ProductCard.css';
import WebApp from '@twa-dev/sdk';
import { resolveImageUrl } from '../utils/image';
import { formatProductTitle } from '../utils/product-title';
import { formatPrice } from '../utils/price';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onAdd: (e: MouseEvent) => void;
  countInCart?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onAdd, countInCart = 0 }) => {
  const [isAddedAnim, setIsAddedAnim] = useState(false);
  const attributes = (product as Product & { attributes?: Record<string, unknown>; image_url?: string }).attributes;
  const extraImages = attributes?.images;
  const rawImage =
    product.images?.[0] ||
    (Array.isArray(extraImages) ? (extraImages[0] as string) : undefined) ||
    (typeof extraImages === 'string' ? extraImages : undefined) ||
    (attributes?.image as string | undefined) ||
    (attributes?.imageUrl as string | undefined) ||
    (product as Product & { image_url?: string }).image_url;
  const imageSrc = rawImage ? resolveImageUrl(rawImage) : '';

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

  const displayTitle = formatProductTitle(product.name);

  return (
    <div className="product-card fade-in" onClick={onClick}>
      {/* Image Container */}
      <div className="product-card__image-container">
        {imageSrc ? (
          <img
            src={imageSrc}
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
        <h3 className="product-card__title">
          {displayTitle || product.name}
        </h3>
        <div className="product-card__bottom-row">
          <div className="product-card__price-row">
            <span className="product-card__price">
              {formatPrice(product.price)} ₽
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="product-card__old-price">
                {formatPrice(product.old_price)}
              </span>
            )}
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
    </div>
  );
};

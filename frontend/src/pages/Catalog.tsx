import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    WebApp.MainButton.hide();
    
    // TODO: Загрузка товаров из API после интеграции с Posiflora
    const loadProducts = async () => {
      try {
        setLoading(true);
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // setProducts(data.data || []);
        setProducts([]); // Пока пустой массив
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) {
    return <div className="loading">Загрузка каталога...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>🌺 Каталог</h1>
      
      {products.length === 0 ? (
        <div style={{ 
          padding: '40px 20px',
          textAlign: 'center',
          color: '#6C757D'
        }}>
          <p style={{ marginBottom: '16px', fontSize: '18px' }}>
            Каталог пуст
          </p>
          <p style={{ fontSize: '14px' }}>
            Товары появятся после интеграции с системой учёта Posiflora.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginTop: '20px'
        }}>
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid #DEE2E6',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
            >
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                />
              )}
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {product.name}
              </h3>
              <p style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: '#FF6B9D'
              }}>
                {product.price} ₽
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

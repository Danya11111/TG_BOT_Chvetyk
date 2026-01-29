import { config } from '../../config';
import type { FloriaProductRaw } from './types';

export interface MappedProduct {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  currency: string;
  category_name?: string;
  images: string[];
  in_stock: boolean;
  composition?: string;
  attributes?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const baseUrl = (config.floria.apiBaseUrl || 'https://flowers5-serv.uplinkweb.ru/5042').replace(/\/$/, '');

function resolveImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${path}`;
}

/**
 * Map a Floria API product object to our Product shape.
 */
export function mapFloriaProductToProduct(item: FloriaProductRaw): MappedProduct {
  const imagesRaw = item.images || [];
  const sorted = Array.isArray(imagesRaw)
    ? [...imagesRaw].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0))
    : [];
  const images: string[] = sorted
    .map((img) => (img && typeof img.url === 'string' ? resolveImageUrl(img.url) : ''))
    .filter(Boolean);

  const notAvailable = Number(item.not_available);
  const in_stock = notAvailable !== 1;

  return {
    id: Number(item.id),
    name: String(item.name || ''),
    price: Number(item.price) || 0,
    old_price: item.old_price != null && Number.isFinite(Number(item.old_price)) ? Number(item.old_price) : undefined,
    currency: 'RUB',
    category_name: item.category != null ? String(item.category) : undefined,
    images,
    in_stock,
    composition: item.composition != null ? String(item.composition) : undefined,
    attributes: {},
    created_at: new Date(),
    updated_at: new Date(),
  };
}

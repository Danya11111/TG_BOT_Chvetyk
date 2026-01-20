import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ScrapedCatalog, ScrapedCategory, ScrapedProduct } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';

function normalizeUrl(path: string): string {
  const base = config.scraper.baseUrl.replace(/\/+$/, '');
  if (path.startsWith('http')) return path;
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 20000,
    });
    return res.data as string;
  } catch (error) {
    logger.warn(`Scraper: failed to fetch ${url}:`, error);
    return null;
  }
}

function extractNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.replace(/\s+/g, '').match(/([\d.,]+)/);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(num) ? num : undefined;
}

function isProbablyProductUrl(url: string): boolean {
  return /product|catalog|buk|rose|rosa|bouquet|buquet|tovar|item/i.test(url);
}

async function parseProductPage(url: string): Promise<ScrapedProduct | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  const name =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim();

  const price =
    extractNumber($('[itemprop="price"]').attr('content')) ||
    extractNumber($('.price, .product-price, .current-price').first().text());

  const oldPrice =
    extractNumber($('.old-price, .product-old-price, .price-old').first().text()) || undefined;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('[itemprop="description"]').first().text().trim() ||
    $('.product-description').first().text().trim();

  const images = new Set<string>();
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) images.add(normalizeUrl(ogImage));
  $('img').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src');
    if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) {
      images.add(normalizeUrl(src));
    }
  });

  const breadcrumbs = $('.breadcrumb a, .breadcrumbs a')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const categoryName = breadcrumbs[breadcrumbs.length - 2];
  const categorySlug = categoryName ? slugify(categoryName) : undefined;

  const inStockText =
    $('.in-stock, .product-available, .availability').first().text().toLowerCase() || '';
  const inStock =
    inStockText.includes('в наличии') ||
    inStockText.includes('есть') ||
    (!inStockText.includes('нет') && !inStockText.includes('под заказ'));

  if (!name || !price) {
    logger.warn(`Scraper: missing name or price for ${url}`);
  }

  return {
    url,
    name: name || 'Без названия',
    price: price || 0,
    oldPrice,
    description,
    images: Array.from(images).slice(0, 10),
    categorySlug,
    inStock,
    attributes: {
      sourceUrl: url,
    },
  };
}

async function parseCategoryPage(url: string): Promise<{ products: string[]; category?: ScrapedCategory }> {
  const html = await fetchHtml(url);
  if (!html) return { products: [] };

  const $ = cheerio.load(html);

  const categoryName =
    $('h1').first().text().trim() ||
    $('.page-title, .category-title').first().text().trim() ||
    $('title').text().trim();

  const slug = categoryName ? slugify(categoryName) : undefined;
  const category: ScrapedCategory | undefined = categoryName
    ? {
        name: categoryName,
        slug: slug || '',
        url,
        image: $('meta[property="og:image"]').attr('content') || undefined,
      }
    : undefined;

  const productLinks = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const full = normalizeUrl(href.split('?')[0]);
    if (isProbablyProductUrl(full)) {
      productLinks.add(full);
    }
  });

  return { products: Array.from(productLinks), category };
}

async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = `${config.scraper.baseUrl.replace(/\/+$/, '')}/sitemap.xml`;
  const html = await fetchHtml(sitemapUrl);
  if (!html) return [];
  const matches = [...html.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) => m[1]).filter((u) => u.startsWith('http'));
}

export async function scrapeCatalog(): Promise<ScrapedCatalog> {
  const seenProducts = new Set<string>();
  const products: ScrapedProduct[] = [];
  const categories: ScrapedCategory[] = [];

  const urlsFromSitemap = await fetchSitemapUrls();
  const seedUrls = urlsFromSitemap.length ? urlsFromSitemap : [config.scraper.baseUrl];

  for (const url of seedUrls) {
    if (products.length >= config.scraper.maxProducts) break;

    if (isProbablyProductUrl(url)) {
      if (seenProducts.has(url)) continue;
      const product = await parseProductPage(url);
      if (product) {
        seenProducts.add(url);
        products.push(product);
      }
      continue;
    }

    // treat as category/listing
    const { products: links, category } = await parseCategoryPage(url);
    if (category && !categories.find((c) => c.slug === category.slug)) {
      categories.push(category);
    }
    for (const link of links) {
      if (products.length >= config.scraper.maxProducts) break;
      if (seenProducts.has(link)) continue;
      const product = await parseProductPage(link);
      if (product) {
        seenProducts.add(link);
        products.push(product);
        if (category && !product.categorySlug) {
          product.categorySlug = category.slug;
        }
      }
    }
  }

  return {
    categories,
    products,
  };
}

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

interface CategoryParseResult {
  products: string[];
  pages: string[];
  category?: ScrapedCategory;
}

async function parseCategoryPage(
  url: string,
  seedCategory?: ScrapedCategory
): Promise<CategoryParseResult> {
  const html = await fetchHtml(url);
  if (!html) return { products: [], pages: [] };

  const $ = cheerio.load(html);

  const categoryName =
    seedCategory?.name ||
    $('h1').first().text().trim() ||
    $('.page-title, .category-title').first().text().trim() ||
    $('title').text().trim();

  const slug = seedCategory?.slug || (categoryName ? slugify(categoryName) : undefined);
  const category: ScrapedCategory | undefined = categoryName
    ? {
        name: categoryName,
        slug: slug || '',
        url,
        image: seedCategory?.image || $('meta[property="og:image"]').attr('content') || undefined,
      }
    : seedCategory;

  const productLinks = new Set<string>();
  const cardSelectors = [
    '.product-item',
    '.product-card',
    '.catalog__item',
    '.catalog-item',
    '.item-product',
    '.products__item',
  ];

  cardSelectors.forEach((selector) => {
    $(selector).each((_, el) => {
      const link = $(el).find('a[href]').first().attr('href');
      if (!link) return;
      const full = normalizeUrl(link.split('?')[0]);
      if (isProbablyProductUrl(full)) {
        productLinks.add(full);
      }
    });
  });

  if (productLinks.size === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const full = normalizeUrl(href.split('?')[0]);
      if (isProbablyProductUrl(full)) {
        productLinks.add(full);
      }
    });
  }

  const pageLinks = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (!/PAGEN_|page=|\/page\//i.test(href)) return;
    pageLinks.add(normalizeUrl(href));
  });

  return { products: Array.from(productLinks), pages: Array.from(pageLinks), category };
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

  const defaultSections: ScrapedCategory[] = [
    { name: 'Собраны сегодня', slug: 'sobranyi-segodnya', url: normalizeUrl('/sobranyi-segodnya/') },
    { name: 'Розы', slug: 'rozy', url: normalizeUrl('/rozy/') },
    { name: 'Букеты', slug: 'bukety', url: normalizeUrl('/bukety/') },
    { name: 'Свадьба', slug: 'svadba', url: normalizeUrl('/svadba/') },
    { name: 'Композиции', slug: 'kompozicii', url: normalizeUrl('/kompozicii/') },
    { name: 'Подарки', slug: 'podarki', url: normalizeUrl('/podarki/') },
  ];

  const sectionSeeds =
    config.scraper.sectionUrls && config.scraper.sectionUrls.length
      ? config.scraper.sectionUrls.map((url) => ({ name: '', slug: '', url }))
      : defaultSections;

  for (const seed of sectionSeeds) {
    if (products.length >= config.scraper.maxProducts) break;

    const visitedPages = new Set<string>();
    const pageQueue = [seed.url];

    while (pageQueue.length && products.length < config.scraper.maxProducts) {
      const pageUrl = pageQueue.shift()!;
      if (visitedPages.has(pageUrl)) continue;
      visitedPages.add(pageUrl);

      const { products: links, pages, category } = await parseCategoryPage(pageUrl, seed);
      if (category && !categories.find((c) => c.slug === category.slug)) {
        categories.push(category);
      }

      pages.forEach((page) => {
        if (!visitedPages.has(page)) {
          pageQueue.push(page);
        }
      });

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
  }

  if (!products.length) {
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
  }

  return {
    categories,
    products,
  };
}

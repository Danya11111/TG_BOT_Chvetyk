export interface ScrapedCategory {
  name: string;
  slug: string;
  url: string;
  parentSlug?: string;
  image?: string;
  sort?: number;
}

export interface ScrapedProduct {
  url: string;
  name: string;
  price: number;
  oldPrice?: number;
  description?: string;
  images: string[];
  categorySlug?: string;
  inStock: boolean;
  attributes?: Record<string, any>;
}

export interface ScrapedCatalog {
  categories: ScrapedCategory[];
  products: ScrapedProduct[];
}

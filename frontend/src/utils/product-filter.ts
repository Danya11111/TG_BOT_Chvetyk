import { Product } from '../types/catalog';

export function filterProductsByQuery(products: Product[], searchQuery: string): Product[] {
  if (!searchQuery.trim()) {
    return products;
  }

  const query = searchQuery.toLowerCase().trim();
  const queryWords = query.split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    const productName = product.name.toLowerCase();
    const productWords = productName.split(/\s+/);

    return queryWords.some(
      (queryWord) =>
        productWords.some((productWord) => productWord.includes(queryWord)) ||
        productName.includes(queryWord)
    );
  });
}

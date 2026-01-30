/**
 * Проверка наличия товаров в Floria API.
 * Запуск: npm run floria:check (из backend) или node dist/integrations/floria/check.js в Docker.
 */
import { config } from '../../config';
import { getFloriaProducts } from './client';

async function run(): Promise<void> {
  const baseUrl = config.floria.apiBaseUrl;
  console.log('Floria API base URL:', baseUrl);

  try {
    const products = await getFloriaProducts({
      categoryId: 0,
      limit: 10,
      offset: 0,
      needComposition: 0,
    });

    const count = products.length;
    console.log('Floria products (sample):', count);
    if (count > 0) {
      products.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. id=${p.id} name="${p.name}" price=${p.price}`);
      });
      console.log('OK: товары в Floria есть.');
    } else {
      console.log('ВНИМАНИЕ: Floria вернул 0 товаров (categoryId=0, limit=10). Проверьте FLORIA_API_BASE_URL и FLORIA_API_TOKEN.');
    }
  } catch (err) {
    console.error('Ошибка при запросе к Floria:', err);
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

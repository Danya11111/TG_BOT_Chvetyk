import { Request, Response } from 'express';
import { productService, ProductFilters } from '../../services/product.service';
import { buildSuccessResponse } from '../utils/response';
import { ValidationError } from '../../utils/errors';

class ProductController {
  async list(req: Request, res: Response): Promise<void> {
    const filters: ProductFilters = {
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      inStock:
        req.query.inStock === 'true'
          ? true
          : req.query.inStock === 'false'
            ? false
            : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await productService.getProducts(filters);

    res.json(buildSuccessResponse(result.data, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (Number.isNaN(productId)) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await productService.getProductById(productId);

    res.json(buildSuccessResponse(product));
  }
}

export const productController = new ProductController();

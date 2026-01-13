import { Request, Response } from 'express';
import { categoryService } from '../../services/category.service';
import { buildSuccessResponse } from '../utils/response';
import { ValidationError } from '../../utils/errors';

class CategoryController {
  async list(_req: Request, res: Response): Promise<void> {
    const categories = await categoryService.getCategories();
    res.json(buildSuccessResponse(categories));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const categoryId = parseInt(req.params.id, 10);

    if (Number.isNaN(categoryId)) {
      throw new ValidationError('Invalid category ID');
    }

    const category = await categoryService.getCategoryById(categoryId);
    res.json(buildSuccessResponse(category));
  }
}

export const categoryController = new CategoryController();

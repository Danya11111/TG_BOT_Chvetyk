import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';

class PickupController {
  async getPoints(_req: Request, res: Response): Promise<void> {
    // TODO: реализация после интеграции с Posiflora
    res.json(
      buildSuccessResponse([], {
        message: 'Pickup points will be available after Posiflora integration',
      })
    );
  }

  async calculate(_req: Request, res: Response): Promise<void> {
    // TODO: реализация расчёта доставки
    res.json(
      buildSuccessResponse({
        deliveryCost: 0,
        message: 'Delivery calculation will be available after configuration',
      })
    );
  }
}

export const pickupController = new PickupController();

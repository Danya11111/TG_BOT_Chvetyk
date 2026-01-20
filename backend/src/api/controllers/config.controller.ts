import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { customerData } from '../../config/customer-data';

class ConfigController {
  async getCustomerConfig(_req: Request, res: Response): Promise<void> {
    res.json(
      buildSuccessResponse({
        brand: customerData.brand,
        contacts: customerData.contacts,
        delivery: customerData.delivery,
        pickup: customerData.pickup,
        bonuses: customerData.bonuses,
        payments: customerData.payments,
        cardRequisites: customerData.cardRequisites,
        managerPhone: customerData.managerPhone,
        sbpQr: customerData.sbpQr,
      })
    );
  }
}

export const configController = new ConfigController();

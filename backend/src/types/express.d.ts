import { TelegramUser } from './telegram';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends TelegramUser {}
    interface Request {
      user?: TelegramUser;
    }
  }
}

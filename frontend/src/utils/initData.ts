import WebApp from '@twa-dev/sdk';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

export function getTelegramInitData(): string | undefined {
  try {
    return WebApp.initData || window?.Telegram?.WebApp?.initData;
  } catch {
    return undefined;
  }
}

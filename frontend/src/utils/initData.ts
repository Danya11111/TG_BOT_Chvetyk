import WebApp from '@twa-dev/sdk';

declare global {
  interface Window {
    Telegram?: any;
  }
}

export function getTelegramInitData(): string | undefined {
  try {
    return WebApp.initData || window?.Telegram?.WebApp?.initData;
  } catch {
    return undefined;
  }
}

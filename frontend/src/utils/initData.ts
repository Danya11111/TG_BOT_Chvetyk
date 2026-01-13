import WebApp from '@twa-dev/sdk';

export function getTelegramInitData(): string | undefined {
  try {
    return WebApp.initData || window?.Telegram?.WebApp?.initData;
  } catch {
    return undefined;
  }
}

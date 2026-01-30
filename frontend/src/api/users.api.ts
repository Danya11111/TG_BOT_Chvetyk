import { isAxiosError } from 'axios';
import apiClient from './client';

const RETRY_DELAYS_MS = [1000, 2000];

function shouldRetryGetMe(err: unknown): boolean {
  if (isAxiosError(err) && err.response?.status != null) {
    const status = err.response.status;
    if (status >= 400 && status < 500) return false;
  }
  return true;
}

export type UserTier = {
  title: string;
  cashbackPercent: number;
  fromTotalSpent: number;
};

export type UserMeResponse = {
  telegramId: number;
  username: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  welcomeBonusClaimed?: boolean;
  bonus: {
    balance: number;
    totalSpent: number;
    tier: UserTier;
    cashbackPercent: number;
    welcomeBonus: number;
    maxSpendPercent: number;
  };
};

export type ClaimWelcomeBonusResponse = {
  success: boolean;
  bonusBalance: number;
  welcomeBonusClaimed: boolean;
};

export async function getMe(): Promise<UserMeResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await apiClient.get('/api/users/me');
      return response.data?.data;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length && shouldRetryGetMe(err)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function updateMe(payload: { phone?: string; name?: string; email?: string }): Promise<UserMeResponse> {
  const response = await apiClient.patch('/api/users/me', payload);
  return response.data?.data;
}

export async function claimWelcomeBonus(phone: string): Promise<ClaimWelcomeBonusResponse> {
  const response = await apiClient.post('/api/users/me/claim-welcome-bonus', { phone });
  return response.data?.data;
}

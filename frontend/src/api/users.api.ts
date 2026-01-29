import apiClient from './client';

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
  const response = await apiClient.get('/api/users/me');
  return response.data?.data;
}

export async function updateMe(payload: { phone?: string; name?: string; email?: string }): Promise<UserMeResponse> {
  const response = await apiClient.patch('/api/users/me', payload);
  return response.data?.data;
}

export async function claimWelcomeBonus(phone: string): Promise<ClaimWelcomeBonusResponse> {
  const response = await apiClient.post('/api/users/me/claim-welcome-bonus', { phone });
  return response.data?.data;
}

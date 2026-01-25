import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { PosifloraSessionResponse } from './types';

interface PosifloraTokens {
  accessToken: string;
  refreshToken: string;
  expireAt: Date;
  refreshExpireAt: Date;
}

class PosifloraApiClient {
  private client: AxiosInstance;
  private tokens: PosifloraTokens | null = null;
  private refreshing: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.posiflora.apiUrl,
      timeout: config.posiflora.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
    });
  }

  private isEnabled(): boolean {
    return Boolean(config.posiflora.enabled && config.posiflora.apiUrl);
  }

  private isTokenValid(token?: PosifloraTokens | null): boolean {
    if (!token) return false;
    const safetyWindowMs = 60_000;
    return token.expireAt.getTime() - safetyWindowMs > Date.now();
  }

  private isRefreshValid(token?: PosifloraTokens | null): boolean {
    if (!token) return false;
    const safetyWindowMs = 60_000;
    return token.refreshExpireAt.getTime() - safetyWindowMs > Date.now();
  }

  private async createSession(): Promise<string> {
    if (!config.posiflora.username || !config.posiflora.password) {
      throw new Error('POSIFLORA_USERNAME and POSIFLORA_PASSWORD are required');
    }

    const response = await this.client.post<PosifloraSessionResponse>('/sessions', {
      data: {
        type: 'sessions',
        attributes: {
          username: config.posiflora.username,
          password: config.posiflora.password,
        },
      },
    });

    const attributes = response.data.data.attributes;
    this.tokens = {
      accessToken: attributes.accessToken,
      refreshToken: attributes.refreshToken,
      expireAt: new Date(attributes.expireAt),
      refreshExpireAt: new Date(attributes.refreshExpireAt),
    };

    return attributes.accessToken;
  }

  private async refreshSession(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      return this.createSession();
    }

    const response = await this.client.patch<PosifloraSessionResponse>('/sessions', {
      data: {
        type: 'sessions',
        attributes: {
          refreshToken: this.tokens.refreshToken,
        },
      },
    });

    const attributes = response.data.data.attributes;
    this.tokens = {
      accessToken: attributes.accessToken,
      refreshToken: attributes.refreshToken,
      expireAt: new Date(attributes.expireAt),
      refreshExpireAt: new Date(attributes.refreshExpireAt),
    };

    return attributes.accessToken;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Posiflora integration is disabled');
    }

    if (this.isTokenValid(this.tokens)) {
      return this.tokens!.accessToken;
    }

    if (this.refreshing) {
      return this.refreshing;
    }

    const shouldRefresh = this.isRefreshValid(this.tokens);
    this.refreshing = (shouldRefresh ? this.refreshSession() : this.createSession())
      .catch((error) => {
        logger.error('Posiflora session refresh failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.tokens = null;
        throw error;
      })
      .finally(() => {
        this.refreshing = null;
      });

    return this.refreshing;
  }

  async request<T>(configOverrides: AxiosRequestConfig, attempt = 0): Promise<T> {
    const token = await this.getAccessToken();
    try {
      const response = await this.client.request<T>({
        ...configOverrides,
        headers: {
          ...configOverrides.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 && attempt < 1) {
        this.tokens = null;
        return this.request<T>(configOverrides, attempt + 1);
      }
      throw error;
    }
  }
}

export const posifloraApiClient = new PosifloraApiClient();

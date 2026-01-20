import { NextFunction, Request, Response } from 'express';
import { getRedisClient, cache } from '../../database/redis';
import { TooManyRequestsError } from '../../utils/errors';

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
}

async function increment(key: string, windowSeconds: number): Promise<number> {
  try {
    const client = await getRedisClient();
    const tx = client.multi();
    tx.incr(key);
    tx.expire(key, windowSeconds);
    const execResult = await tx.exec();
    const count = execResult && Array.isArray(execResult) ? (execResult[0] as number) : 0;
    return count ?? 0;
  } catch {
    const current = (await cache.get<number>(key)) || 0;
    const next = current + 1;
    await cache.set(key, next, windowSeconds);
    return next;
  }
}

function buildLimiter({ keyPrefix, limit, windowSeconds }: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }
    const userKey = req.user?.id ? `user:${req.user.id}` : '';
    const ipKey = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${userKey || ipKey}`;

    const count = await increment(key, windowSeconds);
    if (count > limit) {
      throw new TooManyRequestsError('Rate limit exceeded');
    }
    next();
  };
}

export const authRateLimiter = buildLimiter({
  keyPrefix: 'rl:auth',
  limit: 20,
  windowSeconds: 60,
});

export const readRateLimiter = buildLimiter({
  keyPrefix: 'rl:read',
  limit: 120,
  windowSeconds: 60,
});

export const writeRateLimiter = buildLimiter({
  keyPrefix: 'rl:write',
  limit: 60,
  windowSeconds: 60,
});

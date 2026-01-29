import { db } from '../database/connection';
import { config } from '../config';
import { customerData } from '../config/customer-data';
import { logger } from '../utils/logger';
import { posifloraClientService } from '../integrations/posiflora/client.service';

export type LoyaltyTier = {
  title: string;
  cashbackPercent: number;
  fromTotalSpent: number;
};

export type LoyaltyInfo = {
  bonusBalance: number;
  totalSpent: number;
  tier: LoyaltyTier;
  welcomeBonus: number;
  maxSpendPercent: number;
};

export const WELCOME_BONUS_DESCRIPTION = 'WELCOME_BONUS';

const PHONE_REGEX = /^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/;

/** Returns true if the user (by telegram_id) has already received the welcome bonus. */
export async function getWelcomeBonusClaimed(telegramId: number): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
     FROM bonus_history bh
     INNER JOIN users u ON u.id = bh.user_id
     WHERE u.telegram_id = $1 AND bh.description = $2
     LIMIT 1`,
    [telegramId, WELCOME_BONUS_DESCRIPTION]
  );
  return result.rows.length > 0;
}

function getBonusSettings(): {
  welcomeBonus: number;
  maxSpendPercent: number;
  tiers: LoyaltyTier[];
} {
  const raw: any = (customerData as any).bonuses || {};
  const welcomeBonus = Number(raw.welcomeBonus ?? 500);
  const maxSpendPercent = Number(raw.maxSpendPercent ?? 10);
  const tiers: LoyaltyTier[] = Array.isArray(raw.tiers) ? raw.tiers : [];
  return {
    welcomeBonus: Number.isFinite(welcomeBonus) ? welcomeBonus : 500,
    maxSpendPercent: Number.isFinite(maxSpendPercent) ? maxSpendPercent : 10,
    tiers: tiers
      .map((t) => ({
        title: String((t as any).title || 'Стандарт'),
        cashbackPercent: Number((t as any).cashbackPercent ?? 5),
        fromTotalSpent: Number((t as any).fromTotalSpent ?? 0),
      }))
      .filter((t) => Number.isFinite(t.cashbackPercent) && Number.isFinite(t.fromTotalSpent))
      .sort((a, b) => a.fromTotalSpent - b.fromTotalSpent),
  };
}

export function pickTier(totalSpent: number): LoyaltyTier {
  const { tiers } = getBonusSettings();
  const spent = Number.isFinite(totalSpent) ? totalSpent : 0;
  let current: LoyaltyTier | null = null;
  for (const tier of tiers) {
    if (spent >= tier.fromTotalSpent) {
      current = tier;
    }
  }
  return current || { title: 'Стандарт', cashbackPercent: 5, fromTotalSpent: 0 };
}

function formatTelegramName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || (user.username ? `@${user.username}` : 'Клиент');
}

export async function upsertUserFromTelegram(user: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): Promise<{
  id: number;
  telegram_id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  bonus_balance: number;
  posiflora_customer_id: string | null;
}> {
  const fullName = formatTelegramName(user);
  const result = await db.query(
    `INSERT INTO users (telegram_id, telegram_username, name, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (telegram_id)
     DO UPDATE SET
       telegram_username = EXCLUDED.telegram_username,
       name = COALESCE(EXCLUDED.name, users.name),
       updated_at = NOW()
     RETURNING id, telegram_id, name, phone, email, bonus_balance, posiflora_customer_id`,
    [user.id, user.username || null, fullName || null]
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    telegram_id: Number(row.telegram_id),
    name: row.name ? String(row.name) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    bonus_balance: Number(row.bonus_balance || 0),
    posiflora_customer_id: row.posiflora_customer_id ? String(row.posiflora_customer_id) : null,
  };
}

export async function getUserTotalSpent(userId: number): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(o.total), 0) AS total_spent
     FROM orders o
     WHERE o.user_id = $1 AND o.payment_status = 'confirmed'`,
    [userId]
  );
  const value = Number(result.rows[0]?.total_spent || 0);
  return Number.isFinite(value) ? value : 0;
}

export async function getLoyaltyInfoByTelegramId(telegramId: number): Promise<LoyaltyInfo> {
  const userResult = await db.query(
    `SELECT id, bonus_balance
     FROM users
     WHERE telegram_id = $1`,
    [telegramId]
  );
  const userId = Number(userResult.rows[0]?.id || 0);
  const bonusBalance = Number(userResult.rows[0]?.bonus_balance || 0);

  const totalSpent = userId ? await getUserTotalSpent(userId) : 0;
  const tier = pickTier(totalSpent);
  const { welcomeBonus, maxSpendPercent } = getBonusSettings();

  return {
    bonusBalance: Number.isFinite(bonusBalance) ? bonusBalance : 0,
    totalSpent,
    tier,
    welcomeBonus,
    maxSpendPercent,
  };
}

export async function grantWelcomeBonusIfNeeded(user: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): Promise<{ awarded: boolean; bonusBalance: number }> {
  const { welcomeBonus } = getBonusSettings();
  const amount = Number.isFinite(welcomeBonus) ? welcomeBonus : 500;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const fullName = formatTelegramName(user);
    const upsert = await client.query(
      `INSERT INTO users (telegram_id, telegram_username, name, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telegram_id)
       DO UPDATE SET
         telegram_username = EXCLUDED.telegram_username,
         name = COALESCE(EXCLUDED.name, users.name),
         updated_at = NOW()
       RETURNING id, bonus_balance, phone`,
      [user.id, user.username || null, fullName || null]
    );
    const userId = Number(upsert.rows[0]?.id || 0);
    if (!userId) {
      throw new Error('Failed to upsert user');
    }

    const exists = await client.query(
      `SELECT 1
       FROM bonus_history
       WHERE user_id = $1 AND description = $2
       LIMIT 1`,
      [userId, WELCOME_BONUS_DESCRIPTION]
    );

    if (exists.rows.length) {
      await client.query('COMMIT');
      return { awarded: false, bonusBalance: Number(upsert.rows[0]?.bonus_balance || 0) };
    }

    const updated = await client.query(
      `UPDATE users
       SET bonus_balance = bonus_balance + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING bonus_balance`,
      [amount, userId]
    );

    await client.query(
      `INSERT INTO bonus_history (user_id, type, amount, description)
       VALUES ($1, 'accrued', $2, $3)`,
      [userId, amount, WELCOME_BONUS_DESCRIPTION]
    );

    await client.query('COMMIT');
    const bonusBalance = Number(updated.rows[0]?.bonus_balance || 0);
    return { awarded: true, bonusBalance: Number.isFinite(bonusBalance) ? bonusBalance : 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type ClaimWelcomeBonusResult = {
  awarded: boolean;
  bonusBalance: number;
  welcomeBonusClaimed: boolean;
};

/**
 * Claim welcome bonus: requires phone. Updates user phone, awards 500 once, syncs to Posiflora.
 * Idempotent: if already claimed, returns welcomeBonusClaimed: true and current balance without awarding again.
 */
export async function claimWelcomeBonus(telegramId: number, phone: string): Promise<ClaimWelcomeBonusResult> {
  const trimmed = (phone || '').trim().replace(/\s/g, '');
  if (!trimmed || !PHONE_REGEX.test(trimmed)) {
    throw new Error('Invalid phone format');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, bonus_balance FROM users WHERE telegram_id = $1`,
      [telegramId]
    );
    let userId: number;
    if (userResult.rows.length === 0) {
      const insert = await client.query(
        `INSERT INTO users (telegram_id, phone, updated_at)
         VALUES ($1, $2, NOW())
         RETURNING id, bonus_balance`,
        [telegramId, trimmed]
      );
      userId = Number(insert.rows[0]?.id || 0);
    } else {
      userId = Number(userResult.rows[0].id);
      await client.query(
        `UPDATE users SET phone = $1, updated_at = NOW() WHERE telegram_id = $2`,
        [trimmed, telegramId]
      );
    }

    if (!userId) {
      throw new Error('Failed to get or create user');
    }

    const exists = await client.query(
      `SELECT 1 FROM bonus_history WHERE user_id = $1 AND description = $2 LIMIT 1`,
      [userId, WELCOME_BONUS_DESCRIPTION]
    );

    if (exists.rows.length) {
      await client.query('COMMIT');
      const balanceResult = await db.query(
        `SELECT bonus_balance FROM users WHERE id = $1`,
        [userId]
      );
      const balance = Number(balanceResult.rows[0]?.bonus_balance || 0);
      return { awarded: false, bonusBalance: balance, welcomeBonusClaimed: true };
    }

    const { welcomeBonus } = getBonusSettings();
    const amount = Number.isFinite(welcomeBonus) ? welcomeBonus : 500;

    const updated = await client.query(
      `UPDATE users
       SET bonus_balance = bonus_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING bonus_balance`,
      [amount, userId]
    );
    await client.query(
      `INSERT INTO bonus_history (user_id, type, amount, description)
       VALUES ($1, 'accrued', $2, $3)`,
      [userId, amount, WELCOME_BONUS_DESCRIPTION]
    );

    await client.query('COMMIT');
    const bonusBalance = Number(updated.rows[0]?.bonus_balance || 0);
    return { awarded: true, bonusBalance, welcomeBonusClaimed: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Best-effort sync local user bonus balance into Posiflora customer points.
 * - If this is the first time we link a user to Posiflora: we merge existing Posiflora points + local balance.
 * - Afterwards we keep Posiflora points equal to local balance.
 */
export async function syncUserBonusesToPosiflora(telegramId: number): Promise<void> {
  if (!config.posiflora.enabled) return;

  const userResult = await db.query(
    `SELECT id, name, phone, email, bonus_balance, posiflora_customer_id
     FROM users
     WHERE telegram_id = $1`,
    [telegramId]
  );
  const userRow = userResult.rows[0];
  if (!userRow) return;
  const phone = userRow.phone ? String(userRow.phone) : '';
  if (!phone.trim()) return;

  const userId = Number(userRow.id);
  const localBalance = Number(userRow.bonus_balance || 0);
  const isFirstLink = !userRow.posiflora_customer_id;

  try {
    // Ensure customer exists in Posiflora (create/update by phone)
    const customer =
      (userRow.posiflora_customer_id
        ? await posifloraClientService.getCustomerById(String(userRow.posiflora_customer_id))
        : null) ||
      (await posifloraClientService.syncCustomer({
        name: String(userRow.name || 'Клиент'),
        phone,
        email: userRow.email ? String(userRow.email) : null,
      }));

    if (!customer) return;

    const posifloraPoints = Number(customer.attributes?.currentPoints || 0);
    const mergedBalance = isFirstLink ? posifloraPoints + localBalance : localBalance;
    const target = Math.max(0, Math.floor(Number.isFinite(mergedBalance) ? mergedBalance : 0));

    if (Number.isFinite(posifloraPoints) && Math.floor(posifloraPoints) !== target) {
      await posifloraClientService.setCustomerPoints(customer.id, target);
    }

    // Store link + align local balance to what we wrote
    await db.query(
      `UPDATE users
       SET posiflora_customer_id = $1,
           bonus_balance = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [customer.id, target, userId]
    );
  } catch (error) {
    logger.warn('Failed to sync user bonuses to Posiflora', {
      telegramId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


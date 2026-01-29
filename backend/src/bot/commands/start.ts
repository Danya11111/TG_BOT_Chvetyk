import { Context } from 'telegraf';
import { config } from '../../config';
import { customerData } from '../../config/customer-data';
import { db } from '../../database/connection';
import { logger } from '../../utils/logger';

const formatMessage = (lines: string[], placeholders: Record<string, string>) =>
  lines
    .map((line) =>
      Object.keys(placeholders).reduce(
        (result, key) => result.replaceAll(`{${key}}`, placeholders[key]),
        line
      )
    )
    .join('\n');

export async function handleStart(ctx: Context): Promise<void> {
  const user = ctx.from;
  if (!user) {
    logger.warn('handleStart: user is null');
    return;
  }

  const userId = user.id.toString();
  const firstName = user.first_name || 'друг';

  logger.info(`handleStart called for user ${userId} (${firstName})`);

  try {
    // Проверяем, есть ли пользователь в базе данных
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [userId]
    );

    const isNewUser = existingUser.rows.length === 0;
    logger.info(`User ${userId} is ${isNewUser ? 'new' : 'existing'}`);

    if (isNewUser) {
      // Первое сообщение при открытии бота (как на картинке 2)
      const firstMessage = formatMessage(customerData.botMessages.newUserIntro, {
        name: firstName,
        phone: customerData.contacts.phone,
      });

      logger.info(`Sending first message to new user ${userId}`);
      await ctx.reply(firstMessage, {
        reply_markup: {
          keyboard: [
            [{ text: '/start' }],
          ],
          resize_keyboard: true,
        },
      });
      logger.info(`First message sent to user ${userId}`);

      const profileUrl = config.telegram.webappUrl.replace(/\/$/, '') + '/profile';
      await ctx.reply('Получите 500 бонусов в подарок — откройте профиль и нажмите кнопку ниже.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎁 Получить 500 бонусов', web_app: { url: profileUrl } }],
          ],
        },
      });
    } else {
      // Сообщение после нажатия /start (как на картинке 3, но с кнопкой "Открыть каталог")
      const welcomeMessage = formatMessage(customerData.botMessages.existingUserWelcome, {
        name: firstName,
        phone: customerData.contacts.phone,
      });

      logger.info(`Sending welcome message to existing user ${userId}`);
      
      // Проверяем, является ли URL HTTPS или localhost (для Telegram Desktop localhost работает)
      const isHttps = config.telegram.webappUrl.startsWith('https://');
      const isLocalhost = config.telegram.webappUrl.includes('localhost') || config.telegram.webappUrl.includes('127.0.0.1');
      
      if (isHttps || isLocalhost) {
        const profileUrl = config.telegram.webappUrl.replace(/\/$/, '') + '/profile';
        await ctx.reply(welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Получить 500 бонусов', web_app: { url: profileUrl } }],
              [{ text: '🌺 Открыть каталог', web_app: { url: config.telegram.webappUrl } }],
            ],
          },
        });
      } else {
        // Если URL не HTTPS и не localhost - показываем только текстовое сообщение
        await ctx.reply(
          welcomeMessage + '\n\n' +
          '⚠️ Каталог будет доступен после настройки HTTPS для Mini App.\n' +
          'Для тестирования используйте команду /menu',
          {
            reply_markup: {
              keyboard: [
                [{ text: '/menu' }],
              ],
              resize_keyboard: true,
            },
          }
        );
      }
      logger.info(`Welcome message sent to user ${userId}`);
    }
  } catch (error) {
    logger.error('Error in handleStart:', error);
    // В случае ошибки показываем стандартное сообщение
    const welcomeMessage = formatMessage(customerData.botMessages.existingUserWelcome, {
      name: firstName,
      phone: customerData.contacts.phone,
    });

    try {
      // Проверяем, является ли URL HTTPS
      const isHttps = config.telegram.webappUrl.startsWith('https://');
      
      if (isHttps) {
        const profileUrl = config.telegram.webappUrl.replace(/\/$/, '') + '/profile';
        await ctx.reply(welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Получить 500 бонусов', web_app: { url: profileUrl } }],
              [{ text: '🌺 Открыть каталог', web_app: { url: config.telegram.webappUrl } }],
            ],
          },
        });
      } else {
        await ctx.reply(
          welcomeMessage + '\n\n' +
          '⚠️ Каталог будет доступен после настройки HTTPS для Mini App.\n' +
          'Для тестирования используйте команду /menu',
          {
            reply_markup: {
              keyboard: [
                [{ text: '/menu' }],
              ],
              resize_keyboard: true,
            },
          }
        );
      }
    } catch (replyError) {
      logger.error('Error sending reply:', replyError);
      // В случае ошибки отправляем простое текстовое сообщение
      try {
        await ctx.reply(welcomeMessage);
      } catch (e) {
        logger.error('Error sending fallback message:', e);
      }
    }
  }
}

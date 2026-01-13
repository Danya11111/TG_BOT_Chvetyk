import { Context } from 'telegraf';
import { config } from '../../config';
import { db } from '../../database/connection';
import { logger } from '../../utils/logger';

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
      const firstMessage = 
        `Что может делать этот бот?\n\n` +
        `Здравствуй! Добро пожаловать в Цветочный №21! 🌱\n\n` +
        `Мы известны своей заботой о клиентах и розами по себестоимости.\n\n` +
        `У нас всё честно и искренне - красивые букеты в бесплатной коробке, с подкормкой и открыткой ❤️\n\n` +
        `Оформи заказ через Mini App в боте — мы доставим цветы в Чебоксары и Новочебоксарск.\n\n` +
        `Если возникнут вопросы, менеджер на связи с 8:00 до 24:00 🧑‍💻\n\n` +
        `Подписывайся на наш Telegram-канал, чтобы первым узнавать о новинках и предложениях: @cvetochniy21\n\n` +
        `Чтобы заказать нажми «СТАРТ» 👇`;

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

      // Сохраняем пользователя в базу данных
      await db.query(
        'INSERT INTO users (telegram_id, telegram_username, name, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (telegram_id) DO NOTHING',
        [userId, user.username || null, user.first_name || null]
      );
      logger.info(`User ${userId} saved to database`);
    } else {
      // Сообщение после нажатия /start (как на картинке 3, но с кнопкой "Открыть каталог")
      const welcomeMessage = 
        `Здравствуйте, ${firstName} и добро пожаловать в Цветочный №21! 🌿\n\n` +
        `Мы рады предложить вам разнообразные букеты, наполненные свежестью и ароматом, а также стильные композиции, которые добавят ярких красок в любое ваше событие! 🎉\n\n` +
        `Нажмите на кнопку ниже, и наш менеджер с радостью поможет вам выбрать идеальный букет или примет ваш заказ. Мы готовы сделать ваш день особенным! 💖`;

      logger.info(`Sending welcome message to existing user ${userId}`);
      
      // Проверяем, является ли URL HTTPS или localhost (для Telegram Desktop localhost работает)
      const isHttps = config.telegram.webappUrl.startsWith('https://');
      const isLocalhost = config.telegram.webappUrl.includes('localhost') || config.telegram.webappUrl.includes('127.0.0.1');
      
      if (isHttps || isLocalhost) {
        // Если URL HTTPS или localhost - показываем кнопку WebApp
        await ctx.reply(welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
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
    const welcomeMessage = 
      `Здравствуйте, ${firstName} и добро пожаловать в Цветочный №21! 🌿\n\n` +
      `Мы рады предложить вам разнообразные букеты, наполненные свежестью и ароматом, а также стильные композиции, которые добавят ярких красок в любое ваше событие! 🎉\n\n` +
      `Нажмите на кнопку ниже, и наш менеджер с радостью поможет вам выбрать идеальный букет или примет ваш заказ. Мы готовы сделать ваш день особенным! 💖`;

    try {
      // Проверяем, является ли URL HTTPS
      const isHttps = config.telegram.webappUrl.startsWith('https://');
      
      if (isHttps) {
        await ctx.reply(welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
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

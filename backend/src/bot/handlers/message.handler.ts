import { Context } from 'telegraf';
import { customerData } from '../../config/customer-data';
import { handleMenu } from '../commands/menu';
import { db } from '../../database/connection';

const formatMessage = (lines: string[], placeholders: Record<string, string>) =>
  lines
    .map((line) =>
      Object.keys(placeholders).reduce(
        (result, key) => result.replaceAll(`{${key}}`, placeholders[key]),
        line
      )
    )
    .join('\n');

export async function handleMessage(ctx: Context): Promise<void> {
  const message = (ctx.message as any)?.text;

  if (!message) {
    return;
  }

  // Пропускаем команды (они обрабатываются отдельно через setupCommands)
  // Команды обрабатываются раньше, чем этот обработчик
  if (message.startsWith('/')) {
    return;
  }

  const user = ctx.from;
  if (!user) return;

  // Обработка текстовых сообщений (кнопки меню)
  switch (message) {
    case 'СТАРТ':
    case 'Старт':
    case 'старт':
      // Обрабатываем как команду /start
      {
        const { handleStart } = await import('../commands/start');
        await handleStart(ctx);
        return;
      }

    case '📦 Мои заказы':
      await ctx.reply('Функция "Мои заказы" будет доступна после интеграции с Posiflora.');
      break;

    case '💰 Мои бонусы':
      await ctx.reply('Функция "Мои бонусы" будет доступна после интеграции с Posiflora.');
      break;

    case 'ℹ️ О нас':
      await ctx.reply(
        formatMessage(customerData.botMessages.aboutShort, {
          name: user?.first_name || '',
          phone: customerData.contacts.phone,
        })
      );
      break;

    case '❓ Помощь':
      await ctx.reply(
        formatMessage(customerData.botMessages.help, {
          name: user?.first_name || '',
          phone: customerData.contacts.phone,
        })
      );
      break;

    default:
      // Для неизвестных сообщений проверяем, новый ли пользователь
      try {
        const userId = user.id.toString();
        const existingUser = await db.query(
          'SELECT id FROM users WHERE telegram_id = $1',
          [userId]
        );

        if (existingUser.rows.length === 0) {
          // Новый пользователь - показываем первое приветственное сообщение
          const firstMessage = formatMessage(customerData.botMessages.newUserIntro, {
            name: user.first_name || '',
            phone: customerData.contacts.phone,
          });

          await ctx.reply(firstMessage, {
            reply_markup: {
              keyboard: [
                [{ text: '/start' }],
              ],
              resize_keyboard: true,
            },
          });

          // Сохраняем пользователя
          await db.query(
            'INSERT INTO users (telegram_id, telegram_username, name, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (telegram_id) DO NOTHING',
            [userId, user.username || null, user.first_name || null]
          );
        } else {
          // Существующий пользователь - показываем меню
          await handleMenu(ctx);
        }
      } catch (error) {
        console.error('Error in handleMessage:', error);
        await handleMenu(ctx);
      }
      break;
  }
}

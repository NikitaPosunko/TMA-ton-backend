import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import 'dotenv/config';
import { AuthService } from 'src/auth/auth.service';
import { Telegraf, Markup } from 'telegraf';
import * as moment from 'moment-timezone';

// // enum with notification types: aboutToExpire, expired
// enum NotificationType {
//   ABOUT_TO_EXPIRE = 'aboutToExpire',
//   EXPIRED = 'expired',
// }

@Injectable()
export class TelegramBotService {
  private bot: Telegraf;
  private BOT_TOKEN = process.env.BOT_TOKEN ?? '';
  //private WEB_APP_URL = 'https://adapted-worm-one.ngrok-free.app';
  private WEB_APP_URL = 'https://curious-serval-usable.ngrok-free.app';
  private BOT_USER_NAME = 'MiniAppTgPaymentLoginVideo_bot';

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly authService: AuthService,
  ) {
    this.bot = new Telegraf(this.BOT_TOKEN);

    this.bot.start(async (ctx) => {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;

      // create new user with telegramUserId and botChatId
      // or update botChatId for existing user
      await this.authService.updateChatWithBotIdForUserOrCreateUser(
        userId,
        chatId,
      );

      // inline button launch
      ctx.reply(
        'Log in to mini app!',
        Markup.inlineKeyboard([
          Markup.button.webApp('Launch Mini App', this.WEB_APP_URL),
        ]),
      );

      // bot menu button launch Log in vie Telegram
      ctx.setChatMenuButton({
        text: 'Log in with Telegram',
        type: 'web_app',
        web_app: { url: this.WEB_APP_URL },
      });
    });

    this.bot.launch();
    console.log('Bot is running...');
  }

  //
  //------------------- Schedule Message subscription is about to expire  -------------------------//
  //

  async scheduleMessageSubscriptionIsAboutToExpire(
    subscriptionEndDate: Date,
    chatId: number,
  ) {
    const sendMessage = async () => {
      const formatedDate = moment(subscriptionEndDate)
        .tz('Europe/Kiev')
        .format('YYYY-MM-DD HH:mm:ss');
      const message = `Your subscription will expire ` + `${formatedDate}`;

      try {
        await this.bot.telegram.sendMessage(chatId, message);
      } catch (error) {
        console.error(`Failed to send notification to user:`, error);
      }
    };

    const timeout = setTimeout(
      sendMessage,
      // subscract one minute from subscriptionEndDate using Date object
      subscriptionEndDate.getTime() - Date.now() - 60 * 1000,
    );

    this.schedulerRegistry.addTimeout(`notifyAboutToExpire-${chatId}`, timeout);
  }

  //
  //------------------- Schedule Message subscription has expired  -------------------------//
  //

  async scheduleMessageSubscriptionHasExpired(
    subscriptionEndDate: Date,
    chatId: number,
  ) {
    const sendMessage = async () => {
      try {
        await this.bot.telegram.sendMessage(
          chatId,
          'Your subscription has expired',
        );
      } catch (error) {
        console.error(`Failed to send notification to user:`, error);
      }
    };

    const timeout = setTimeout(
      sendMessage,
      subscriptionEndDate.getTime() - Date.now(),
    );

    this.schedulerRegistry.addTimeout(`notifyHasExpired-${chatId}`, timeout);
  }
}

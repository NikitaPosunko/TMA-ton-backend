import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

@Injectable()
export class TelegramBotService {
  private bot: Telegraf;
  private BOT_TOKEN = process.env.BOT_TOKEN ?? '';
  private WEB_APP_URL = 'https://adapted-worm-one.ngrok-free.app';
  private BOT_USER_NAME = 'MiniAppTgPaymentLoginVideo_bot';

  constructor() {
    this.bot = new Telegraf(this.BOT_TOKEN);

    this.bot.start((ctx) => {
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
}

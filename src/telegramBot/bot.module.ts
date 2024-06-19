// telegram-bot.module.ts
import { Module } from '@nestjs/common';
import { TelegramBotService } from './bot.service';

@Module({
  providers: [TelegramBotService],
})
export class TelegramBotModule {}

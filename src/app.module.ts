import { BadRequestException, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramBotModule } from './telegramBot/bot.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

function validateMongoUrl(mongoUrl: string): void {
  try {
    new URL(mongoUrl);
  } catch {
    throw new BadRequestException('Invalid DB URL'); // Throws an exception if the URL is invalid
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true, isGlobal: true }),
    AuthModule,
    SubscriptionModule,
    MongooseModule.forRoot(
      (() => {
        const mongoUrl = process.env.MONGO_URL ?? '';
        validateMongoUrl(mongoUrl);
        return mongoUrl;
      })(),
    ),
    TelegramBotModule,
    ScheduleModule.forRoot(),
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}

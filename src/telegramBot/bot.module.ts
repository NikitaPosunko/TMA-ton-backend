import { Module } from '@nestjs/common';
import { TelegramBotService } from './bot.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { BotController } from './bot.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
    DbModule,
  ],
  providers: [TelegramBotService],
  controllers: [BotController],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}

import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from './admin.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { AdminConfig, AdminConfigSchema } from 'src/schemas/adminConfig.schema';
import { HttpModule } from '@nestjs/axios';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from 'src/schemas/subscriptionPlan.schema';
import {
  Subscription,
  SubscriptionSchema,
} from 'src/schemas/subscription.schema';
import { TelegramBotModule } from 'src/telegramBot/bot.module';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      {
        name: AdminConfig.name,
        schema: AdminConfigSchema,
      },
      {
        name: SubscriptionPlan.name,
        schema: SubscriptionPlanSchema,
      },
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
    ]),
    HttpModule,
    TelegramBotModule,
    DbModule,
  ],
  providers: [SubscriptionService, AuthGuard, AdminGuard],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}

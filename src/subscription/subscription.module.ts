import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from './admin.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { AdminConfig, AdminConfigSchema } from 'src/schemas/adminConfig.schema';
import { TonConnectService } from 'src/tonConnect/tonConnect.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      {
        name: AdminConfig.name,
        schema: AdminConfigSchema,
      },
    ]),
    HttpModule,
  ],
  providers: [SubscriptionService, TonConnectService, AuthGuard, AdminGuard],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}

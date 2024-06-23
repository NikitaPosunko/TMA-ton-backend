import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SubscriptionService } from './subscription.service';
import { AdminGuard } from './admin.guard';
import { SubscriberGuard } from './subscriber.guard';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('photos')
  getPhotos() {
    return 'This is a backend login protected route';
  }

  @UseGuards(AdminGuard)
  @Get('admin-wallet')
  getAdminConfig() {
    return this.subscriptionService.getActiveAdminConfig();
  }

  @UseGuards(AdminGuard)
  @Post('set-admin-wallet')
  async setAdminConfig(
    @Body('wallet') adminWallet: string,
    @Headers('user_db_id') adminId: string,
  ) {
    try {
      return this.subscriptionService.setAdminConfig(adminId, adminWallet);
    } catch (error) {
      throw error;
    }
  }

  @Get('get-plans')
  async getSubscriptionPlans() {
    try {
      return this.subscriptionService.getSubscriptionPlans();
    } catch (error) {
      throw error;
    }
  }

  @Get('get-subscription-status')
  async getSubscriptionStatus(@Headers('user_db_id') userDbId: string) {
    try {
      return this.subscriptionService.getSubscriptionStatus(userDbId);
    } catch (error) {
      throw error;
    }
  }

  @Post('user-wallet-confirmation')
  async userWalletConfirmation(
    @Body('wallet') wallet: string,
    @Headers('user_db_id') userDbId: string,
  ) {
    try {
      // add user wallet to db, assign last transaction date to now
      return this.subscriptionService.userWalletConfirmation(userDbId, wallet);
    } catch (error) {
      throw error;
    }
  }

  @Get('active-admin-config')
  async getActiveAdminConfig() {
    try {
      return this.subscriptionService.getActiveAdminConfig();
    } catch (error) {
      throw error;
    }
  }

  @Get('make-subscription')
  async makeSubscription(@Headers('user_db_id') userDbId: string) {
    try {
      return this.subscriptionService.makeSubscription(userDbId);
    } catch (error) {
      throw error;
    }
  }

  @Get('user-balance')
  async getUserPaymentsFromTransactions(
    @Headers('user_db_id') userDbId: string,
  ) {
    try {
      return this.subscriptionService.traverseTransactionsAndUpdateBalance(
        userDbId,
      );
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(SubscriberGuard)
  @Get('subscriber-protected-route')
  async subscriberProtectedRoute(@Headers('user_db_id') userDbId: string) {
    try {
      return { message: 'You are a subscriber', userDbId: userDbId };
    } catch (error) {
      throw error;
    }
  }
}

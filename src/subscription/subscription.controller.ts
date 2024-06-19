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

  @Post('user-wallet-confirmation')
  async userWalletConfirmation(
    @Body('wallet') wallet: string,
    @Headers('user_db_id') userDbId: string,
  ) {
    try {
      // add user wallet and user's last transaction hash to db
      this.subscriptionService.userWalletConfirmation(userDbId, wallet);
      // send back admin wallet
      return this.subscriptionService.getActiveAdminConfig();
    } catch (error) {
      throw error;
    }
  }

  @Get('user-balance')
  async getUserPaymentsFromTransactions(
    @Headers('user_db_id') userDbId: string,
  ) {
    try {
      return this.subscriptionService.treverseTransactionsAndUpdateBalance(
        userDbId,
      );
    } catch (error) {
      throw error;
    }
  }
}

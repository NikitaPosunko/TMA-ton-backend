import { Controller } from '@nestjs/common';
import { TonConnectService } from './tonConnect.service';

// TODO add auth protection
@Controller('ton-connect')
export class TonConnectController {
  constructor(private readonly tonConnectService: TonConnectService) {}

  // @Get('address-info')
  // async getAddressInformation(
  //   @Query('address') friendlyAddress: string,
  // ): Promise<any> {
  //   return this.tonConnectService.getAddressInformation(friendlyAddress);
  // }

  // @Get('transactions')
  // async getTransactions(@Headers('user_db_id') userDbId: string): Promise<any> {
  //   try {
  //     return this.tonConnectService.getUserPayments(userDbId);
  //   } catch (error) {
  //     throw error;
  //   }
  // }
}

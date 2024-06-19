import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import 'dotenv/config';
import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class TonConnectService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // async getAddressInformation(friendlyAddress: string) {
  //   console.log('address:   ' + friendlyAddress);
  //   //const address: Address = Address.parseFriendly(friendlyAddress).address;
  //   //const address: Address = Address.parse(friendlyAddress);
  //   //console.log('address' + address.hash);

  //   return {};
  //   //return await this.api.getAddressInformation(address);
  // }
}

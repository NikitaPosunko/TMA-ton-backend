import { Module } from '@nestjs/common';
import { TonConnectService } from './tonConnect.service';
import { TonConnectController } from './tonConnect.controller';
import 'dotenv/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { HttpModule } from '@nestjs/axios';
//import { TonConnectStorage } from './tonConnect.storage';

@Module({
  // providers: [TonConnectService],
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    HttpModule,
  ],
  providers: [
    TonConnectService,

    // {
    //   provide: 'TON_CONNECT_STORAGE',
    //   useClass: TonConnectStorage,
    // },
  ],
  controllers: [TonConnectController],
  exports: [TonConnectService],
})
export class TonConnectModule {}

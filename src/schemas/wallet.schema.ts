import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema()
export class Wallet {
  @Prop({ required: true })
  walletFriendlyAddress: string;

  @Prop({ required: false, default: new Date(0) })
  lastCheckedTransactionDate: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

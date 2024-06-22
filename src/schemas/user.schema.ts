import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Wallet } from './wallet.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop()
  telegramUserId: number;

  @Prop()
  chatWithBotId: number;

  @Prop()
  telegramUserFirstName?: string;

  @Prop()
  email?: string;

  @Prop({ default: false })
  isAdmin?: boolean;

  @Prop({ type: [Wallet], default: [] })
  wallets: Wallet[];

  @Prop()
  connectedWalletFriendlyAddress?: string;

  @Prop({ type: Types.Decimal128, default: Types.Decimal128.fromString('0') })
  nanotonCoinsBalance: Types.Decimal128;
}

export const UserSchema = SchemaFactory.createForClass(User);

// UserSchema.path('email').validate(function () {
//   // Ensure that either email or telegramUserId is present
//   return this.email || this.telegramUserId;
// }, 'Either email or telegramUserId must be provided.');

// UserSchema.path('telegramUserId').validate(function () {
//   // Ensure that either email or telegramUserId is present
//   return this.email || this.telegramUserId;
// }, 'Either email or telegramUserId must be provided.');

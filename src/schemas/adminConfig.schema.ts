import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminConfigDocument = HydratedDocument<AdminConfig>;

@Schema({ timestamps: true })
export class AdminConfig {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  adminId: Types.ObjectId;

  @Prop({ required: true })
  adminWalletFriendlyAddress: string;

  @Prop({ required: true, default: false })
  active: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);

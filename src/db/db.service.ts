import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class DbService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  //
  //------------------------- add new user with telegramUserId and botChatId to db ------------------------//
  //

  async addUserWithTelegramUserIdAndBotChatIdToDb(
    telegramUserId: number,
    chatWithBotId: number,
  ) {
    const newUserData: User = {
      telegramUserId: telegramUserId,
      chatWithBotId: chatWithBotId,
      isAdmin: false,
      nanotonCoinsBalance: new Types.Decimal128('0'),
      wallets: [],
    };

    await this.userModel.insertMany(newUserData);
  }

  //
  // ---------------------------- Update ChatWithBotId for user or create new user -------------------------------//
  //

  async updateChatWithBotIdForUserOrCreateUser(
    telegramUserId: number,
    chatWithBotId: number,
  ) {
    const user = await this.userModel.findOne({
      telegramUserId: telegramUserId,
    });

    if (!user) {
      // if user is not exists create it
      await this.addUserWithTelegramUserIdAndBotChatIdToDb(
        telegramUserId,
        chatWithBotId,
      );
    } else {
      // if user is exists update chatWithBotId
      await this.userModel.updateOne(
        { telegramUserId: telegramUserId },
        { chatWithBotId: chatWithBotId },
      );
    }
  }

  //
  //------------------------------------- get ChatWithBotId -------------------------------------//
  //

  async getChatWithBotId(userDbId: string) {
    const userDbObjectId = new Types.ObjectId(userDbId);
    const user = await this.userModel.findById(userDbObjectId).exec();
    if (!user) {
      throw new Error('No user found');
    }
    return user.chatWithBotId;
  }

  //
  //---------------------------------------- Find All Users ---------------------------------------------//
  //

  async findAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}

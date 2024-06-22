import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminConfig } from 'src/schemas/adminConfig.schema';
import {
  AdminConfigResponseDto,
  SubscriptionPlanArrayDto,
  SubscriptionPlanDto,
  SubscriptionResponseDto,
  SubscriptionStatus,
  UserBalanceDto,
} from './subscription.dto';
import { User } from 'src/schemas/user.schema';
import { Wallet } from 'src/schemas/wallet.schema';
import { HttpService } from '@nestjs/axios';
import 'dotenv/config';
import { Address } from '@ton/ton';
import { TransactionV3 } from 'src/subscription/types';
import { SubscriptionPlan } from 'src/schemas/subscriptionPlan.schema';
import { Subscription } from 'src/schemas/subscription.schema';
import { TelegramBotService } from 'src/telegramBot/bot.service';

@Injectable()
export class SubscriptionService {
  constructor(
    //
    @InjectModel(AdminConfig.name) private adminConfigModel: Model<AdminConfig>,
    //
    @InjectModel(User.name) private userModel: Model<User>,
    //
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel: Model<SubscriptionPlan>,
    //
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,

    //

    private readonly httpService: HttpService,

    //

    private readonly telegramBotService: TelegramBotService,
  ) {}

  //
  //------------------------------------- get admin config ----------------------------------------//
  //

  async getActiveAdminConfig() {
    const TRANSACTION_DATE = new Date();

    const adminConfig = await this.adminConfigModel
      .findOne({ active: true })
      .exec();
    if (adminConfig === null) {
      return new AdminConfigResponseDto(false, '', TRANSACTION_DATE);
    }
    return new AdminConfigResponseDto(
      true,
      adminConfig.adminWalletFriendlyAddress,
      adminConfig.updatedAt || TRANSACTION_DATE,
    );
  }

  //
  //------------------------------------- add admin config document ----------------------------------------//
  //

  async setAdminConfig(adminId: string, adminWalletFriendlyAddress: string) {
    // updated at
    const TRANSACTION_DATE = new Date();
    const adminObjectId = new Types.ObjectId(adminId);

    // try to find existing admin config
    const newAdminConfig = await this.adminConfigModel
      .findOne({
        adminId: adminObjectId,
        adminWalletFriendlyAddress: adminWalletFriendlyAddress,
      })
      .exec();

    // if admin config exists with this admin wallet and admin id
    if (newAdminConfig) {
      // check if admin config is active

      // if new admin config is active
      if (newAdminConfig.active) {
        // update field updatedAt
        await this.adminConfigModel
          .findByIdAndUpdate(newAdminConfig._id, {
            updatedAt: TRANSACTION_DATE,
          })
          .exec();
        return new AdminConfigResponseDto(
          true,
          adminWalletFriendlyAddress,
          TRANSACTION_DATE,
        );
      }
      // if new admin config is not active

      // 1. set previous not active
      await this.adminConfigModel
        .updateOne(
          { adminId: newAdminConfig._id, active: true },
          {
            active: false,
            //updatedAt: TRANSACTION_DATE
          },
        )
        .exec();

      // 2. set found admin config as active
      await this.adminConfigModel
        .findByIdAndUpdate(newAdminConfig._id, {
          active: true,
          //updatedAt: TRANSACTION_DATE,
        })
        .exec();

      return new AdminConfigResponseDto(
        false,
        adminWalletFriendlyAddress,
        TRANSACTION_DATE,
      );
    }

    // admin config is not exists with this admin wallet and admin id

    // 1. add wallet to admin wallets in user model list if it doesn't exist there

    // check if admin wallet exists in user model
    if (
      (await this.userModel.exists({
        wallets: { walletFriendlyAddress: adminWalletFriendlyAddress },
      })) === null
    ) {
      const newWallet: Wallet = {
        walletFriendlyAddress: adminWalletFriendlyAddress,
        lastCheckedTransactionDate: TRANSACTION_DATE,
      };

      await this.userModel
        .findByIdAndUpdate(adminObjectId, {
          $addToSet: { wallets: newWallet },
        })
        .exec();
    }

    const adminConfigForCreation: AdminConfig = {
      adminId: adminObjectId,
      adminWalletFriendlyAddress: adminWalletFriendlyAddress,
      active: true,
    };
    // 2. create new admin config document with wallet and admin id
    const createdAdminConfig = new this.adminConfigModel(
      adminConfigForCreation,
    );

    // 3. save admin config
    await createdAdminConfig.save();

    // 4. return response
    return new AdminConfigResponseDto(
      false,
      adminWalletFriendlyAddress,
      TRANSACTION_DATE,
    );
  }

  //
  //------------------------------ get admin active wallet friendly address ---------------------------------//
  //

  // async getAdminActiveWalletFriendlyAddress() {
  //   const adminConfig = await this.adminConfigModel
  //     .findOne({ active: true })
  //     .exec();
  //   if (adminConfig === null) {
  //     throw new Error('No admin config found');
  //   }
  //   return new UserWalletConfirmationResponseDto(adminConfig.adminWallet);
  // }

  // TODO: add error handling
  //------------------- helper function - update last transaction hash, assign wallet to active ----------------------//
  //

  async AssignWalletToActive(
    userId: string,
    walletFriendlyAddress: string,
    isNewWallet: boolean,
  ) {
    const TRANSACTION_DATE = new Date();
    // 1. update last transaction date for user with userId and wallet in walletts list with walletAddressFriendly

    if (isNewWallet) {
      // new wallet
      const newWallet: Wallet = {
        walletFriendlyAddress: walletFriendlyAddress,
        lastCheckedTransactionDate: TRANSACTION_DATE,
      };
      //
      await this.userModel
        .updateOne(
          { _id: userId },
          {
            $addToSet: {
              wallets: newWallet,
            },
            $set: {
              connectedWalletFriendlyAddress: walletFriendlyAddress,
            },
          },
        )
        .exec();
    } else {
      // not new wallet
      await this.userModel
        .findOneAndUpdate(
          { _id: userId },
          { $set: { connectedWalletFriendlyAddress: walletFriendlyAddress } },
        )
        .exec();
    }
  }

  // TODO: add error handling
  //----- user wallet confirmation -----//
  //

  async userWalletConfirmation(userId: string, walletFriendlyAddress: string) {
    const userObjectId = new Types.ObjectId(userId);

    // check if user exists

    const user = await this.userModel.findById({ _id: userObjectId }).exec();
    if (!user) throw new Error('User not found');

    //console.log(user.wallets);
    // console.log(
    //   '---------------------------------------------------------------',
    // );
    const wallet = user.wallets.find(
      (wallet) => wallet.walletFriendlyAddress === walletFriendlyAddress,
    );

    // if (!wallet) {
    //   console.log(`Wallet with address ${walletFriendlyAddress} not found`);
    //   throw new Error('Wallet not found');
    // }

    //console.log(wallet.walletFriendlyAddress);
    if (wallet) {
      // user has this wallet in the list
      this.AssignWalletToActive(userId, walletFriendlyAddress, false);
    } else {
      // user doesn't have this wallet in the list
      this.AssignWalletToActive(userId, walletFriendlyAddress, true);
    }
  }

  //
  //---------- HELPER FUNCTION ---------- get last transaction date for user with userDbId --------------------------//
  //

  async getLastTransactionDateForUserActiveWallet(userDbId: string) {
    const userDbObjectId = new Types.ObjectId(userDbId);
    const user = await this.userModel.findById(userDbObjectId).exec();
    if (!user) throw new Error('User not found');

    const connectedWalletFriendlyAddress = user.connectedWalletFriendlyAddress;
    if (!connectedWalletFriendlyAddress) throw new Error('No wallet found');

    const wallet = user.wallets.find(
      (wallet) =>
        wallet.walletFriendlyAddress === connectedWalletFriendlyAddress,
    );
    if (!wallet) throw new Error('Wallet not found');

    return wallet.lastCheckedTransactionDate;
  }

  //
  //---------- HELPER FUNCTION ---------- set new last transaction date for user with userDbId --------------------------//
  //

  async setLastTransactionDateForUserActiveWallet(
    userDbId: string,
    date: Date,
  ) {
    const userDbObjectId = new Types.ObjectId(userDbId);
    const user = await this.userModel.findById(userDbObjectId).exec();
    if (!user) throw new Error('User not found');

    const connectedWalletFriendlyAddress = user.connectedWalletFriendlyAddress;
    if (!connectedWalletFriendlyAddress) throw new Error('No wallet found');

    await this.userModel
      .updateOne(
        {
          _id: userDbObjectId,
          'wallets.walletFriendlyAddress': connectedWalletFriendlyAddress,
        },
        { $set: { 'wallets.$.lastCheckedTransactionDate': date } },
      )
      .exec();

    // const wallet = user.wallets.find(
    //   (wallet) =>
    //     wallet.walletFriendlyAddress === connectedWalletFriendlyAddress,
    // );
    // if (!wallet) throw new Error('Wallet not found');

    // wallet.lastCheckedTransactionDate = date;
    // user.save();
  }

  //
  //---------- HELPER FUNCTION ---------- update user balance in db --------------------------//
  //

  async updateUserBalance(userId: string, amountNanoton: bigint) {
    try {
      const userDbObjectId = new Types.ObjectId(userId);
      const user = await this.userModel.findById(userId).exec();
      if (!user) throw new Error('User not found');

      // Add the new amountNanoton to the existing balance
      await this.userModel
        .findByIdAndUpdate(userDbObjectId, {
          $inc: {
            nanotonCoinsBalance: Types.Decimal128.fromString(
              amountNanoton.toString(),
            ),
          },
        })
        .exec();
    } catch (error) {
      throw new Error(error);
    }
  }

  //
  //---------- HELPER FUNCTION ---------- is transaction from user to admin --------------------------//
  //

  async getNanotonsAmountFromUserToAdmin(
    transaction: TransactionV3,
    userFriendlyAddress: string,
    adminWallet: string,
  ) {
    const userRawAddress = Address.parse(userFriendlyAddress).toRawString();
    const adminRawAddress = Address.parse(adminWallet).toRawString();

    console.log(userRawAddress);
    console.log(adminRawAddress);

    console.log(new Date(transaction.now * 1000));
    let amount = 0n;

    if (transaction.description.aborted === false) {
      // transaction is not aborted

      const outMessages = transaction.out_msgs;

      if (outMessages && outMessages?.length > 0) {
        for (const outMessage of outMessages) {
          //console.log(outMessage);
          if (
            outMessage.source.toLowerCase() === userRawAddress.toLowerCase() &&
            outMessage.destination.toLowerCase() ===
              adminRawAddress.toLowerCase()
          ) {
            //console.log(outMessage);
            amount += BigInt(outMessage.value);
          }
        }
      }
    }
    return amount;
  }

  //
  //---------------------------- get user payments from transactions -------------------------------//
  //

  async traverseTransactionsAndUpdateBalance(userDbId: string) {
    try {
      const userDbObjectId = new Types.ObjectId(userDbId);

      // get user
      const user = await this.userModel.findById(userDbObjectId).exec();

      if (!user) {
        throw new Error('No user found');
      }
      if (!user.connectedWalletFriendlyAddress) {
        throw new Error('No connected wallet found');
      }

      // parse active wallet address
      const userFriendlyAddress = user.connectedWalletFriendlyAddress;

      // get admin address
      const activeAdminConfigResponse = await this.getActiveAdminConfig();

      //console.log(activeAdminConfigResponse);
      const adminFriendlyAddress =
        activeAdminConfigResponse.walletFriendlyAddress;

      if (!adminFriendlyAddress) {
        throw new Error('No admin address found');
      }

      // get transactions api url
      const baseUrl = 'https://testnet.toncenter.com/api/v3/transactions';

      //

      let isTransactionsLeft = true;

      // traverse transactions and calculate how many nanoton coins user sent to admin wallet
      while (isTransactionsLeft) {
        isTransactionsLeft = false;

        // get last transaction date for this address
        const lastTransactionDate =
          await this.getLastTransactionDateForUserActiveWallet(userDbId);

        if (!lastTransactionDate) {
          throw new Error('No last transaction date found');
        }

        // build url
        const params = new URLSearchParams({});

        // search for output messages i.e. sent transactions from userAddress
        const accounts = [userFriendlyAddress];
        accounts.forEach((account) => params.append('account', account));

        params.append(
          'start_utime',
          Math.floor(lastTransactionDate.getTime() / 1000).toString(),
        );
        params.append('sort', 'asc');

        const url = `${baseUrl}?${params.toString()}`;

        console.log(url);

        // do get transactions request
        try {
          const response = await this.httpService.axiosRef.get(url, {
            headers: {
              'X-API-Key': process.env.TON_CENTER_API_KEY,
            },
          });

          const transactions: TransactionV3[] = response.data.transactions;

          console.log(
            '---------------------------------transactions------------------------------------',
          );
          console.log(transactions?.length);

          for (const transaction of transactions) {
            // if transaction target address is admin wallet and amount is not 0
            const amount = await this.getNanotonsAmountFromUserToAdmin(
              transaction,
              userFriendlyAddress,
              adminFriendlyAddress,
            );
            console.log(amount);

            // add transaction nanotons amount to db
            if (amount > 0) {
              await this.updateUserBalance(userDbId, amount);
            }
          }

          if (transactions.length > 0) {
            isTransactionsLeft = true;

            console.log(
              '-----------------------------------------------------------------------',
            );
            console.log(new Date((transactions[0].now + 1) * 1000));
            console.log(
              new Date((transactions[transactions.length - 1].now + 1) * 1000),
            );

            // add new last transaction date from db
            await this.setLastTransactionDateForUserActiveWallet(
              userDbId,
              new Date((transactions[transactions.length - 1].now + 1) * 1000),
            );
          }
        } catch (error) {
          console.error(
            `Request failed with status ${error.response.status}: ${error.response.data}`,
          );
          throw error;
        }
      }

      // get user balance
      const userAfter = await this.userModel.findById(userDbObjectId).exec();
      if (!userAfter) {
        throw new Error('No user found');
      }
      if (!userAfter?.nanotonCoinsBalance) {
        throw new Error('No nanotons balance found');
      }

      const userNanotonsBalance = userAfter?.nanotonCoinsBalance;

      // return user balance
      return new UserBalanceDto(userNanotonsBalance.toString());
    } catch (error) {
      throw error;
    }
  }

  //
  //------------------------------------- get subscription plans -------------------------------------//
  //

  async getSubscriptionPlans(): Promise<SubscriptionPlanArrayDto> {
    // get subscription plans from db
    const subscriptionPlans = await this.subscriptionPlanModel.find().exec();
    //console.log(subscriptionPlans);

    const subscriptionPlanDtos: SubscriptionPlanDto[] = subscriptionPlans.map(
      (subscriptionPlan) =>
        new SubscriptionPlanDto(
          subscriptionPlan.title,
          subscriptionPlan.description,
          subscriptionPlan.priceInNanotons.toString(),
          subscriptionPlan.durationInSeconds,
        ),
    );
    return new SubscriptionPlanArrayDto(subscriptionPlanDtos);
  }

  //
  //------------------------------------- get subscription status -------------------------------------//
  //

  async getSubscriptionStatus(
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const latestActiveSubscription =
      await this.getLatestActiveSubscription(userId);
    if (latestActiveSubscription !== null) {
      console.log('--------------------------');
      console.log(latestActiveSubscription);
      return new SubscriptionResponseDto(
        SubscriptionStatus.ACTIVE,
        latestActiveSubscription.endDate,
      );
    }
    console.log('--------------------------');
    console.log(latestActiveSubscription);
    return new SubscriptionResponseDto(SubscriptionStatus.INACTIVE);
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
  //------------------------------------- make subscription -------------------------------------//
  //

  async makeSubscription(userId: string) {
    // find latest subscription
    const latestActiveSubscription =
      await this.getLatestActiveSubscription(userId);

    // if subscription is already active response that subscription is already active
    if (latestActiveSubscription !== null) {
      // return success response
      return new SubscriptionResponseDto(
        SubscriptionStatus.ACTIVE,
        latestActiveSubscription.endDate,
      );
    }

    // if subscription is not active - make subscription
    // Immediate, 5 seconds, 5 seconds, 10 seconds, and 30 seconds
    const intervals = [0, 5000, 5000, 10000, 30000];

    for (let i = 0; i < intervals.length; i++) {
      if (i > 0) {
        // Wait for the interval
        await new Promise((resolve) => setTimeout(resolve, intervals[i]));
      }
      const userBalanceDto =
        await this.traverseTransactionsAndUpdateBalance(userId);

      const userBalanceInNanotonString = userBalanceDto.nanotonCoinsBalance;
      // convert string to number
      const userBalanceInNanoton = BigInt(userBalanceInNanotonString);

      // geting first subscriptoin plan
      // change to request argument
      const subscriptionPlanArrayDto = await this.getSubscriptionPlans();
      const subscriptionPlan = subscriptionPlanArrayDto.subscriptionPlans[0];

      const subscriptionPriceInNanotonString =
        subscriptionPlan.priceInNanotonCoins;
      // convert string to number
      const subscriptionPriceInNanoton = BigInt(
        subscriptionPriceInNanotonString,
      );

      if (userBalanceInNanoton >= subscriptionPriceInNanoton) {
        // update subscription status in db
        const subscriptionEndDate = await this.updateSubscriptionStatus(
          userId,
          subscriptionPlan.durationInSeconds,
        );

        // update balance in db
        await this.updateUserBalance(userId, -subscriptionPriceInNanoton);

        // get chat with bot id
        const chatWithBotId = await this.getChatWithBotId(userId);

        // schadule notification for subscription about to expire date
        this.telegramBotService.scheduleMessageSubscriptionIsAboutToExpire(
          subscriptionEndDate,
          chatWithBotId,
        );

        // schadule notification for subscription end date
        this.telegramBotService.scheduleMessageSubscriptionHasExpired(
          subscriptionEndDate,
          chatWithBotId,
        );

        // return success response
        return new SubscriptionResponseDto(
          SubscriptionStatus.ACTIVE,
          subscriptionEndDate,
        );
      }
    }
    // return failure response
    return new SubscriptionResponseDto(SubscriptionStatus.INACTIVE);
  }

  //
  // ----------------------------- get latest active subscription --------------------------------//
  //

  async getLatestActiveSubscription(
    userId: string,
  ): Promise<Subscription | null> {
    const userObjectId = new Types.ObjectId(userId);
    const subscriptions: Subscription[] = await this.subscriptionModel
      .aggregate([
        {
          $match: {
            userId: userObjectId,
            endDate: { $gt: new Date() },
          },
        },
        {
          $sort: { endDate: -1 },
        },
        {
          $limit: 1,
        },
      ])
      .exec();

    return subscriptions.length > 0 ? subscriptions[0] : null;
  }

  //
  // ----------------------------- update subscription status in db --------------------------------//
  //

  private async updateSubscriptionStatus(
    userId: string,
    subscriptionDurationInSeconds: number,
  ): Promise<Date> {
    const userObjectId = new Types.ObjectId(userId);
    const TRANSACTION_DATE = new Date();
    const SUBSCRIPTION_END_DATE = new Date(
      TRANSACTION_DATE.getTime() + subscriptionDurationInSeconds * 1000,
    );

    // find latest subscription
    const latestActiveSubscription =
      await this.getLatestActiveSubscription(userId);

    // is user already subscribed?
    if (latestActiveSubscription !== null) {
      // add new subscription document
      // with start date equal to latest subscription end date
      // and end date equal to transaction date

      const newSubscriptionData: Subscription = {
        userId: userObjectId,
        startDate: latestActiveSubscription.endDate,
        endDate: SUBSCRIPTION_END_DATE,
      };
      const newSubscription = new this.subscriptionModel(newSubscriptionData);
      await newSubscription.save();
    } else {
      // create new subscription

      const newSubscriptionData: Subscription = {
        userId: userObjectId,
        startDate: TRANSACTION_DATE,
        endDate: SUBSCRIPTION_END_DATE,
      };
      const subscription = new this.subscriptionModel(newSubscriptionData);
      await subscription.save();
    }

    return SUBSCRIPTION_END_DATE;
  }

  //
  //
  //
}

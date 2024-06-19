import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminConfig } from 'src/schemas/adminConfig.schema';
import { AdminConfigResponseDto, UserBalanceDto } from './subscription.dto';
import { User } from 'src/schemas/user.schema';
import { Wallet } from 'src/schemas/wallet.schema';
import { HttpService } from '@nestjs/axios';
import 'dotenv/config';
import { Address, fromNano } from '@ton/ton';
import { TransactionV3 } from 'src/subscription/types';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(AdminConfig.name) private adminConfigModel: Model<AdminConfig>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly httpService: HttpService,
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
      // const newBalance = Types.Decimal128.fromString(
      //   (
      //     amountNanoton + BigInt(user.nanotonCoinsBalance.toString())
      //   ).toString(),
      // );

      // user.nanotonCoinsBalance = newBalance;
      // user.save();
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

  async treverseTransactionsAndUpdateBalance(userDbId: string) {
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

      // initialize variables for transactions treversing
      //const NUMBER_OF_TRANSACTIONS_PER_REQUEST = 5;
      //let offset = 0;

      // get transactions api url
      const baseUrl = 'https://testnet.toncenter.com/api/v3/transactions';

      //

      let isTransactionsLeft = true;

      // treverse transactions and calculate how many nanoton coins user sent to admin wallet
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
        //params.append('limit', NUMBER_OF_TRANSACTIONS_PER_REQUEST.toString());
        //params.append('offset', offset.toString());
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
            //offset += NUMBER_OF_TRANSACTIONS_PER_REQUEST;

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

      const userTonBalance = fromNano(
        userAfter?.nanotonCoinsBalance.toString(),
      );

      // return user balance
      return new UserBalanceDto(userTonBalance);
    } catch (error) {
      throw error;
    }
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto, AdminCheckResponseDto } from './auth.dto';
import { WebAppInitData } from './types';
import { User } from 'src/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
  ) {}

  //
  //---------------------------------- Validate Telegram Auth data -----------------------------------//
  //

  async validateTelegramAuth(rowInitData: string): Promise<AuthResponseDto> {
    // init data parsing
    const urlParams = new URLSearchParams(rowInitData);
    const hash = urlParams.get('hash');
    const authDateStr = urlParams.get('auth_date');
    const queryId = urlParams.get('query_id');
    const userStr = urlParams.get('user');

    // Validate presence of necessary parameters
    if (!hash || !authDateStr || !userStr) {
      throw new BadRequestException('Missing required parameters');
    }

    // Validate format of auth_date
    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) {
      throw new BadRequestException('Invalid auth_date format');
    }

    // integrity check
    urlParams.delete('hash');

    const dataCheckString = [...urlParams.entries()]
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN as string)
      .digest();

    const myHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Check if auth_date is not too old
    const currentTime = Date.now();
    const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN ?? '5000', 10);

    if (currentTime - authDate > JWT_EXPIRES_IN) {
      throw new UnauthorizedException('auth_date is too old');
    }

    // valid hash
    if (myHash === hash) {
      // GENERATE JWT TOKEN

      let user;
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        throw new BadRequestException('Invalid user data format');
      }

      const miniAppAuthData: WebAppInitData = {
        auth_date: authDate,
        query_id: queryId ?? undefined,
        user: user,
      };

      return new AuthResponseDto({
        // sign token
        token: await this.jwtService.signAsync(miniAppAuthData),
        authData: miniAppAuthData,
      });
    }
    throw new UnauthorizedException('Invalid hash');
  }

  //
  //---------------------------------- Sign Up with Telegram -----------------------------------//
  //

  async signUpWithTelegram(rowInitData: string): Promise<AuthResponseDto> {
    const telegramAuthResponseDto =
      await this.validateTelegramAuth(rowInitData);

    if (!telegramAuthResponseDto?.authData?.user) {
      throw new UnauthorizedException('Invalid auth data');
    }

    const telegramUserId = telegramAuthResponseDto.authData.user.id;
    const telegramUserFirstName =
      telegramAuthResponseDto.authData.user.first_name;

    // Check if the user exists in the database
    const existingUser = await this.userModel
      .findOne({
        telegramUserId: telegramUserId,
        telegramUserFirstName: telegramUserFirstName,
      })
      .exec();

    if (existingUser) {
      // User already signed up
      return new AuthResponseDto({ alreadySignedUp: true });
    }

    await this.userModel
      .updateOne(
        { telegramUserId: telegramUserId },
        { telegramUserFirstName: telegramUserFirstName },
      )
      .exec();

    const signedUpUser = await this.userModel
      .findOne({ telegramUserId: telegramUserId })
      .exec();

    if (!signedUpUser) {
      throw new BadRequestException('User not found');
    }

    telegramAuthResponseDto.userDbId = signedUpUser._id.toString();
    return telegramAuthResponseDto;
  }

  //
  //---------------------------------- Log In with Telegram -----------------------------------//
  //

  async logInWithTelegram(rowInitData: string): Promise<AuthResponseDto> {
    const telegramAuthResponseDto =
      await this.validateTelegramAuth(rowInitData);

    if (!telegramAuthResponseDto?.authData?.user) {
      throw new UnauthorizedException('Invalid auth data');
    }

    const telegramUserId = telegramAuthResponseDto.authData.user.id;
    const telegramUserFirstName =
      telegramAuthResponseDto.authData.user.first_name;

    // Check if the user exists in the database
    const existingUser = await this.userModel
      .findOne({
        telegramUserId: telegramUserId,
        telegramUserFirstName: telegramUserFirstName,
      })
      .exec();

    if (!existingUser) {
      // User needs to sign up
      return new AuthResponseDto({ needsSignUp: true });
    }

    // User exists
    telegramAuthResponseDto.userDbId = existingUser._id.toString();
    return telegramAuthResponseDto;
  }

  //
  //---------------------------------------- Sign Up with Google ---------------------------------------------//
  //

  async signUpWithGoogle(
    rowInitData: string,
    token: string,
  ): Promise<AuthResponseDto> {
    const telegramAuthResponseDto =
      await this.validateTelegramAuth(rowInitData);

    if (!telegramAuthResponseDto?.authData?.user) {
      throw new UnauthorizedException('Invalid auth data');
    }

    const telegramUserId = telegramAuthResponseDto.authData.user.id;

    const decodedToken = await this.verifyIdTokenGoogle(token);
    const email = decodedToken.email;
    if (!email) {
      throw new Error('Email not found');
    }
    // Check if the user signed up
    const existingUser = await this.userModel.findOne({ email: email }).exec();

    if (existingUser) {
      // User already exists
      return new AuthResponseDto({ alreadySignedUp: true });
    }

    // update user with telegramUserId

    await this.userModel
      .updateOne({ telegramUserId: telegramUserId }, { email: email })
      .exec();

    const signedUpUser = await this.userModel
      .findOne({ telegramUserId: telegramUserId })
      .exec();

    if (!signedUpUser) {
      throw new BadRequestException('User not found');
    }

    return new AuthResponseDto({
      userDbId: signedUpUser._id.toString(),
      email: email,
    });
  }

  //
  //---------------------------------------- Log In with Google ---------------------------------------------//
  //

  async logInWithGoogle(token: string): Promise<AuthResponseDto> {
    const decodedToken = await this.verifyIdTokenGoogle(token);
    const email = decodedToken.email;
    if (!email) {
      throw new Error('Email not found');
    }
    // Check if the user exists in the database
    const existingUser = await this.userModel.findOne({ email: email }).exec();

    if (!existingUser) {
      // User needs to sign up
      return new AuthResponseDto({ needsSignUp: true });
    }

    // User exists
    return new AuthResponseDto({
      userDbId: existingUser._id.toString(),
      email: email,
    });
  }

  //
  //---------------------------------------- verify google auth token ---------------------------------------------//
  //

  async verifyIdTokenGoogle(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.firebaseAdmin.auth().verifyIdToken(token);
    } catch (error) {
      throw new Error('Error verifying google ID token');
    }
  }

  //
  // ---------------------------------------- check if user is admin ---------------------------------------------//
  //

  async adminCheck(userId: string): Promise<AdminCheckResponseDto> {
    const user = await this.userModel.findOne({ _id: userId }).exec();
    if (!user) throw new Error('User not found');

    return new AdminCheckResponseDto(user.isAdmin ?? false);
  }
}

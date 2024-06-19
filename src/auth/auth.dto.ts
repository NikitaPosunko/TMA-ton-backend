import { WebAppInitData } from './types';

export class TelegramAuthRequestDto {
  initData: string;
}

export class AuthResponseDto {
  public token?: string;
  public authData?: WebAppInitData;
  //public googleAuthData?: GoogleAuthRequestDto;
  public userDbId?: string;
  public email?: string;
  public needsSignUp?: boolean;
  public alreadySignedUp?: boolean;

  constructor(
    options: {
      token?: string;
      authData?: WebAppInitData;
      userDbId?: string;
      email?: string;
      needsSignUp?: boolean;
      alreadySignedUp?: boolean;
    } = {},
  ) {
    this.token = options.token;
    this.authData = options.authData;
    this.userDbId = options.userDbId;
    this.email = options.email;
    this.needsSignUp = options.needsSignUp ?? false;
    this.alreadySignedUp = options.alreadySignedUp ?? false;
  }
}

export class CreateTelegramUserDto {
  constructor(public telegramUserId: number) {}
}

export class CreateGoogleUserDto {
  constructor(public email: string) {}
}

export class AdminCheckResponseDto {
  constructor(public isAdmin: boolean) {}
}

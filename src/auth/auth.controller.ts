import 'dotenv/config';
import { Controller, Post, Body, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthRequestDto } from './auth.dto';
import { DbService } from 'src/db/db.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly dbService: DbService,
  ) {}

  @Post('telegram-log-in')
  async telegramLogIn(@Body() authData: TelegramAuthRequestDto) {
    return this.authService.logInWithTelegram(authData.initData);
  }

  @Post('telegram-sign-up')
  async telegramSignUp(@Body() authData: TelegramAuthRequestDto) {
    return this.authService.signUpWithTelegram(authData.initData);
  }

  // TODO remove
  @Get('users')
  async getUsers() {
    return this.dbService.findAllUsers();
  }

  @Post('google-log-in')
  async googleLogIn(@Body('token') token: string) {
    return this.authService.logInWithGoogle(token);
  }

  @Post('google-sign-up')
  async googleSignUp(
    @Body('initData') initData: string,
    @Body('token') token: string,
  ) {
    return this.authService.signUpWithGoogle(initData, token);
  }

  @Get('admin-check')
  async adminCheck(@Headers('user_db_id') userDbId: string) {
    return this.authService.adminCheck(userDbId);
  }
}

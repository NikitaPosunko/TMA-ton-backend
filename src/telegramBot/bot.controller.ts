import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  Headers,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { TelegramBotService } from './bot.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('bot')
export class BotController {
  constructor(private readonly botService: TelegramBotService) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @UploadedFile() photo: Express.Multer.File,
    @Headers('user_db_id') userDbId: string,
  ) {
    try {
      if (!photo) {
        throw new Error('Photo file is missing');
      }
      console.log('File received:', photo);
      //console.log('File size:', photo.size);
      await this.botService.sendPhoto(userDbId, photo.buffer);

      return { message: 'Photo uploaded and sent to Telegram!' };
    } catch (error) {
      throw error;
    }
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const adminId = request.headers['user_db_id'];
    if (adminId === undefined || adminId === null) {
      throw new Error(
        'adminId is missing or null. Only admin users can set admin config',
      );
    }

    // if adminId does not belong to admin user throw and error
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin || !admin.isAdmin) {
      throw new Error('Only admin users can set admin config');
    }

    return true;
  }
}

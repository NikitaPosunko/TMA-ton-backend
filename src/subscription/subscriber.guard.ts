import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatus } from './subscription.dto';

@Injectable()
export class SubscriberGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const userDbId = request.headers['user_db_id'];
    if (userDbId === undefined || userDbId === null) {
      throw new Error(
        'userDbId is missing or null. Only subscribers can access',
      );
    }

    // check if user has active subscription
    const subscriptionStatus =
      await this.subscriptionService.getSubscriptionStatus(userDbId);

    if (subscriptionStatus.status === SubscriptionStatus.INACTIVE) {
      throw new Error('Only subscribers can access');
    }

    return true;
  }
}

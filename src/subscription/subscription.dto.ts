export class AdminConfigResponseDto {
  constructor(
    public isAlreadySet: boolean,
    public walletFriendlyAddress: string,
    public timestamp: Date,
  ) {}
}

export class UserWalletConfirmationResponseDto {
  constructor(public adminWallet: string) {}
}

export class UserBalanceDto {
  constructor(public nanotonCoinsBalance: string) {}
}

export class SubscriptionPlanDto {
  constructor(
    public title: string,
    public description: string,
    public priceInNanotonCoins: string,
    public durationInSeconds: number,
  ) {}
}

export class SubscriptionPlanArrayDto {
  constructor(public subscriptionPlans: SubscriptionPlanDto[]) {}
}

// enum for subscription status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// create response dto
export class SubscriptionResponseDto {
  constructor(
    public status: SubscriptionStatus,
    public endDate?: Date,
  ) {}
}

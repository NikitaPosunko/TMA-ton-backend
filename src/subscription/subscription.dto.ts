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
  constructor(public tonCoinsBalance: string) {}
}

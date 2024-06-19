import { IStorage } from '@tonconnect/sdk';

const storage = new Map<string, string>(); // temporary storage implementation. We will replace it with the redis later

export class TonConnectStorage implements IStorage {
  constructor() {} // we need to have different stores for different users

  // private getKey(key: string): string {
  //   return this.chatId.toString() + key; // we will simply have different keys prefixes for different users
  // }

  async removeItem(key: string): Promise<void> {
    storage.delete(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    storage.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return storage.get(key) || null;
  }
}

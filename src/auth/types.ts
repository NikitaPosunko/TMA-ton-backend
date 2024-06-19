export interface WebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface WebAppInitData {
  user?: WebAppUser;
  auth_date: number;
  query_id?: string;
}

// export function isMiniAppAuthData(data: unknown): data is MiniAppAuthData {
//   if (typeof data !== 'object' || data === null) {
//     return false;
//   }

//   const authData = data as Record<string, unknown>;
//   const keys = [
//     'query_id',
//     'user',
//     'first_name',
//     'last_name',
//     'username',
//     'language_code',
//     'allows_write_to_pm',
//     'auth_date',
//     //'hash',
//   ];

//   return keys.every(
//     (key) => key in authData && typeof authData[key] === 'string',
//   );
// }

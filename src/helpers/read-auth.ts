import fs from 'fs';
import path from 'path';

export interface AuthData {
  authToken: string;
  apiKey: string;
  userId: string;
  accountId: string;
  divisionId: string;
}

export function readAuthData(): AuthData {
  const tokenPath = path.join(__dirname, '../../playwright/.auth/token.json');
  if (!fs.existsSync(tokenPath)) {
    throw new Error('Auth token not found. Run auth-setup first.');
  }
  return JSON.parse(fs.readFileSync(tokenPath, 'utf-8')) as AuthData;
}

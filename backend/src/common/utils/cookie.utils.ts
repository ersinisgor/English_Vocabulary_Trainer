import { CookieOptions } from 'express';
import { parseDurationToMs } from './time.utils';

export function buildRefreshCookieOptions(
  refreshExpiresIn: string,
  isProd: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationToMs(refreshExpiresIn),
  };
}

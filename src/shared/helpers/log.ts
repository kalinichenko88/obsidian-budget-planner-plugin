import { Notice } from 'obsidian';

import { APP_NAME } from '@/constants';

const notice = (message: string): Notice =>
  new Notice(`[${APP_NAME}] ${message}. Please check the console for details.`);

export const logInfo = (message: string, ...args: unknown[]): void => {
  if (process.env.IS_PRODUCTION) {
    return;
  }

  console.info(message, ...args);
};

export const logWarning = (message: string, cause?: Error): void => {
  if (process.env.IS_PRODUCTION) {
    return;
  }

  console.error(message);
  if (cause) console.error(cause);
};

export const logError = (message: string, cause?: Error): void => {
  if (process.env.IS_PRODUCTION) {
    notice(message);
    console.error(cause);
    return;
  }

  console.error(message);
  if (cause) console.error(cause);
};

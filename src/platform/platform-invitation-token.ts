import * as crypto from 'crypto';

export const generatePlatformInvitationToken = (): string =>
  crypto.randomBytes(32).toString('hex');

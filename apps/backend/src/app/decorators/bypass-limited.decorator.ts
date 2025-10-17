import { SetMetadata } from '@nestjs/common';

export const ALLOW_LIMITED_KEY = 'allowLimited';
/** Decorator to allow limited accounts access */
export const BypassLimited = () => SetMetadata(ALLOW_LIMITED_KEY, true);

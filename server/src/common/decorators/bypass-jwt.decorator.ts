import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Decorator to skip JWT auth */
export const BypassJwtAuth = () => SetMetadata(IS_PUBLIC_KEY, true);

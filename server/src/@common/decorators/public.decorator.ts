import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorator to skip JWT auth
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

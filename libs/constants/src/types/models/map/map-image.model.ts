import { MapImage as PrismaMapImage } from '@prisma/client';

export interface MapImage extends PrismaMapImage {
  small: string;
  medium: string;
  large: string;
}

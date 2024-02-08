import { MapReviewComment as PrismaMapReviewComment } from '@prisma/client';
import { User } from '../';

export interface MapReviewComment extends PrismaMapReviewComment {
  user?: User;
}
export type CreateMapReviewComment = Pick<MapReviewComment, 'text'>;
export type UpdateMapReviewComment = CreateMapReviewComment;

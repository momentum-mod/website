import { MapReview as PrismaMapReview } from '@prisma/client';
import { MapReviewComment, MapReviewSuggestion } from '../';
import { MapReviewEdit } from '../';
import { Jsonify } from 'type-fest';

export interface MapReview extends PrismaMapReview {
  comments?: MapReviewComment[];
  suggestions: Jsonify<MapReviewSuggestion[]>;
  editHistory: Jsonify<MapReviewEdit[]> | null;
}

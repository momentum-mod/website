import { MapReview as PrismaMapReview } from '@prisma/client';
import { Jsonify } from 'type-fest';
import { MapReviewComment, MapReviewSuggestion, MapReviewEdit } from '../';

export interface MapReview extends PrismaMapReview {
  comments?: MapReviewComment[];
  suggestions: Jsonify<MapReviewSuggestion[]>;
  editHistory: Jsonify<MapReviewEdit[]> | null;
}

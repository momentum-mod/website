import { MapReview as PrismaMapReview } from '@prisma/client';
import {
  MapReviewComment,
  MapReviewSuggestion,
  MapReviewEdit,
  User
} from '../';

export interface MapReview
  extends Omit<PrismaMapReview, 'suggestions' | 'editHistory' | 'imageIDs'> {
  images: string[];
  numComments?: number;
  comments?: MapReviewComment[];
  suggestions: MapReviewSuggestion[];
  editHistory?: MapReviewEdit[];
  reviewer?: User;
  resolver?: User;
}

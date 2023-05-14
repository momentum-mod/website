import { MapFavorite } from './map-favorite.model';

export interface MapFavorites {
  count?: number;
  favorites: MapFavorite[];
}

const x: PagedReponse<string>;

export interface PagedReponse<Type> {
  count: number;
  response: Type[];
}

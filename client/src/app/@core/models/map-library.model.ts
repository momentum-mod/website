import {MapLibraryEntry} from './map-library-entry';

export interface MapLibrary {
  count?: number;
  entries: MapLibraryEntry[];
}

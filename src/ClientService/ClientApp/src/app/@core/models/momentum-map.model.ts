import {MomentumMapInfo} from './map-info.model';
import {MapCredit} from './map-credit.model';
import {User} from './user.model';
import {MapStats} from './map-stats.model';
import {MapImage} from './map-image.model';
import {MomentumMapType} from './map-type.model';
import {MapFavorite} from './map-favorite.model';
import {MapLibraryEntry} from './map-library-entry';
import {MapTrack} from './map-track.model';

export interface MomentumMap {
  id: number;
  name: string;
  type: MomentumMapType;
  hash: string;
  statusFlag: number;
  createdAt?: string;
  updatedAt?: string;
  info?: MomentumMapInfo;
  credits?: MapCredit[];
  thumbnailID?: number;
  thumbnail?: MapImage;
  images?: MapImage[];
  stats?: MapStats;
  favorites?: MapFavorite[];
  libraryEntries?: MapLibraryEntry[];
  downloadURL?: string;
  submitterID?: number;
  submitter?: User;
  tracks?: MapTrack[];
  mainTrack?: MapTrack;
}

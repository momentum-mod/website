import {MomentumMapInfo} from './map-info.model';
import {MapCredit} from './map-credit.model';
import {User} from './user.model';
import {MapStats} from './map-stats.model';
import {MapImage} from './map-image.model';
import {MomentumMapType} from './map-type.model';
import {MapFavorite} from './map-favorite.model';
import {MapLibraryEntry} from './map-library-entry';

export interface MomentumMap {
  id: number;
  name: string;
  type: MomentumMapType;
  hash: string;
  statusFlag: number;
  createdAt?: Date;
  updatedAt?: Date;
  info?: MomentumMapInfo;
  credits?: MapCredit[];
  images?: MapImage[];
  stats?: MapStats;
  favorites?: MapFavorite[];
  libraryEntries?: MapLibraryEntry[];
  downloadURL?: string;
  submitterID?: string;
  submitter?: User;
}

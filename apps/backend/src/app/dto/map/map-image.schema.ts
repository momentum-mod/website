import { type } from 'arktype';
import {
  imgLargePath,
  imgMediumPath,
  imgSmallPath,
  imgXlPath,
  MapImageSchema
} from '@momentum/constants';
import { Config } from '../../config';

export const MapImageSerializerSchema = type({ id: 'string', '+': 'delete' })
  .pipe(({ id }) => ({
    id,
    small: `${Config.url.cdn}/${imgSmallPath(id)}`,
    medium: `${Config.url.cdn}/${imgMediumPath(id)}`,
    large: `${Config.url.cdn}/${imgLargePath(id)}`,
    xl: `${Config.url.cdn}/${imgXlPath(id)}`
  }))
  .to(MapImageSchema);

export function serializeMapImage(image: string | { id: string }) {
  return MapImageSerializerSchema.assert(
    typeof image === 'string' ? { id: image } : image
  );
}

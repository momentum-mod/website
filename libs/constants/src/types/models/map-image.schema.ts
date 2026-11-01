import { type } from 'arktype';

export const MapImageSchema = type({
  id: 'string',
  small: 'string',
  medium: 'string',
  large: 'string',
  xl: 'string',
  '+': 'delete'
});

export type MapImage = typeof MapImageSchema.infer;

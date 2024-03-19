import { GamemodePrefix } from '@momentum/constants';
import { extractPrefixFromMapName } from './extract-prefix-from-map-name';

describe('extractPrefixFromMapName', () => {
  it('should return a tuple of name and prefix if given a name with a prefix', () => {
    jest.spyOn(GamemodePrefix, 'values').mockReturnValue(['surf'].values());

    expect(extractPrefixFromMapName('surf_my_cool_map')).toMatchObject([
      'my_cool_map',
      'surf'
    ]);
  });

  it('should return a tuple of base name and null if given a name without prefix', () => {
    jest.spyOn(GamemodePrefix, 'values').mockReturnValue(['surf'].values());

    expect(extractPrefixFromMapName('my_cool_map_2')).toMatchObject([
      'my_cool_map_2',
      null
    ]);
  });
});

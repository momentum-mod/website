import { GamemodeInfo, GamemodeInfoProperties } from '@momentum/constants';
import { extractPrefixFromMapName } from './extract-prefix-from-map-name';

describe('extractPrefixFromMapName', () => {
  it('should return a tuple of name and prefix if given a name with a prefix', () => {
    jest
      .spyOn(GamemodeInfo, 'values')
      .mockReturnValue([{ prefix: 'surf' } as GamemodeInfoProperties].values());

    expect(extractPrefixFromMapName('surf_my_cool_map')).toMatchObject([
      'my_cool_map',
      'surf'
    ]);
  });

  it('should return a tuple of base name and null if given a name without prefix', () => {
    jest
      .spyOn(GamemodeInfo, 'values')
      .mockReturnValue([{ prefix: 'surf' } as GamemodeInfoProperties].values());

    expect(extractPrefixFromMapName('my_cool_map_2')).toMatchObject([
      'my_cool_map_2',
      null
    ]);
  });
});

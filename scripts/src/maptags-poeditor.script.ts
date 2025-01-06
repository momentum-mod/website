import * as Enum from '@momentum/enum';
import { MapTag, mapTagEnglishName, mapTagToken } from '@momentum/constants';
import * as fs from 'node:fs';

const defs = Enum.fastValuesNumeric(MapTag).map((tag) => ({
  term: mapTagToken(tag),
  definition: mapTagEnglishName(tag)
}));

// Would prefer to just console.log and pipe but can't get rid of Nx spam
fs.writeFileSync('./maptags-poeditor.json', JSON.stringify(defs, null, 2));

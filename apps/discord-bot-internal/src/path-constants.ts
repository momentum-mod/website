import { join } from 'node:path';

const configFolder = join(__dirname, 'config');
const configFile = join(configFolder, 'config.json');
const dbFolder = join(__dirname, 'data');
const dbFile = join(dbFolder, 'bot_data.db');

export const PathConstants = {
  configFolder,
  configFile,
  dbFolder,
  dbFile
};

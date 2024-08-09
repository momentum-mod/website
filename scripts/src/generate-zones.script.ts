import * as fs from 'node:fs';
import { generateRandomMapZones } from '@momentum/formats/zone';

const USAGE = `generate-zones
==============
Generates randomized zone JSON, writes to given file (because handling stdout in Nx is a bastard).
usage: nx run scripts:generate-zones [-h] OUTPUT_FILE
  --mainSegments=N             (default: 2)
  --mainCheckpoints=N,...,M    (default: 2,2)
  --bonusCheckpoints=N,...,M   (default: 1,1)
  --mapWidth=N,                (default: 1000)
  --zoneWidth=N,               (default: 100)
  --height=N                   (default: 100)
example: nx run scripts:generate-zones zones.json --mainSegments=4 --mainCheckpoints=1,2,3,4 --bonusCheckpoints=0`;

const params = {
  mainSegments: 2,
  mainCheckpoints: [2, 2],
  bonusCheckpoints: [1, 1],
  mapWidth: 1000,
  zoneWidth: 100,
  height: 100
};

if (process.argv[2] === '-h') {
  console.log(USAGE);
  process.exit(0);
}

const optionalArgs = process.argv.slice(3);
if (!optionalArgs.every((arg) => arg.includes('='))) {
  console.error('Invalid arguments');
  console.log(USAGE);
  process.exit(1);
}

optionalArgs
  .map((arg) => arg.split('='))
  .forEach(([key, value]) => {
    const param = key.slice(2);
    if (!key.startsWith('--') || !Object.keys(params).includes(param)) {
      console.error(`Invalid argument: ${param}`);
      console.log(USAGE);
      process.exit(1);
    }

    params[param] = Array.isArray(params[param])
      ? value.split(',').map(Number)
      : Number(value);
  });

try {
  const zones = generateRandomMapZones(
    ...(Object.values(params) as Parameters<typeof generateRandomMapZones>)
  );

  fs.writeFileSync(process.argv[2], JSON.stringify(zones, null, 2));
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}

import { MapZones } from '@momentum/constants';

export class ZoneDiffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZoneDiffValidationError';
  }
}

/**
 * Compares zones against leaderboards and checks if the change is allowed
 */
export function validateZoneDiff(
  newZones: MapZones,
  oldZones?: MapZones,
  allowCreation = false
) {
  if (!oldZones) return;
  const newStages = newZones.tracks.main?.zones?.segments?.length ?? 0;
  const oldStages = oldZones.tracks.main?.zones?.segments?.length ?? 0;
  const diffStages = newStages - oldStages;

  if (diffStages < 0) {
    throw new ZoneDiffValidationError(
      `Zones have less stages than current ones (old: ${oldStages}, new: ${newStages})`
    );
  } else if (diffStages > 0 && !allowCreation) {
    throw new ZoneDiffValidationError(
      `Zones have more stages than current ones (old: ${oldStages}, new: ${newStages})`
    );
  }

  const newBonuses = newZones.tracks.bonuses?.length ?? 0;
  const oldBonuses = oldZones.tracks.bonuses?.length ?? 0;
  const diffBonuses = newBonuses - oldBonuses;

  if (diffBonuses < 0) {
    throw new ZoneDiffValidationError(
      `Zones have less bonuses than current ones (old: ${oldBonuses}, new: ${newBonuses})`
    );
  } else if (diffBonuses > 0 && !allowCreation) {
    throw new ZoneDiffValidationError(
      `Zones have more bonuses than current ones (old: ${oldBonuses}, new: ${newBonuses})`
    );
  }
}

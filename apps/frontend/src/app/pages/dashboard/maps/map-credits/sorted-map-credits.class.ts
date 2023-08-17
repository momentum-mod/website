import { MapCredit, MapCreditType } from '@momentum/constants';
import { Enum } from '@momentum/enum';
import { CreateMapCreditDto } from '@momentum/backend/dto';

/**
 * MapCredit with just the parts we need to handle filtering/editing credits,
 * don't care about the Map data.
 */
export interface PartialMapCredit extends Pick<MapCredit, 'type' | 'user'> {
  description?: string;
}

/**
 * Class wrapper for `MapCredit`s typed into separate areas based on their
 * `MapCreditType`. We need the arrays separated like this to use the CDK drag
 * and drop stuff.
 *
 * Using an Object rather than a Map for easier change detection
 */
export class SortedMapCredits
  implements Record<MapCreditType, PartialMapCredit[]>
{
  [MapCreditType.AUTHOR]: PartialMapCredit[];
  [MapCreditType.CONTRIBUTOR]: PartialMapCredit[];
  [MapCreditType.TESTER]: PartialMapCredit[];
  [MapCreditType.SPECIAL_THANKS]: PartialMapCredit[];

  constructor() {
    this.clear();
  }

  set(credits: PartialMapCredit[], type?: MapCreditType): void {
    if (type === undefined) {
      this.clear();
      for (const credit of credits) {
        this[credit.type].push(credit);
      }
    } else {
      this[type] = credits;
    }
  }

  getAll(): PartialMapCredit[] {
    return this.values().flat();
  }

  getAllSubmittable(): CreateMapCreditDto[] {
    return this.values()
      .flat()
      .map((credit) => ({
        type: credit.type,
        description: credit.description,
        userID: credit.user.id
      }));
  }

  keys(): MapCreditType[] {
    return Enum.values(MapCreditType);
  }

  entries(): [MapCreditType, PartialMapCredit[]][] {
    return this.keys().map((k) => [k, this[k]]);
  }

  values(): PartialMapCredit[][] {
    return this.keys().map((k) => this[k]);
  }

  clear(): void {
    for (const key of this.keys()) {
      this[key] = [];
    }
  }
}

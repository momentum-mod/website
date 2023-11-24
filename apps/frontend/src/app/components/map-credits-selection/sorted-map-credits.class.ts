import {
  CreateMapCredit,
  MapCreditType,
  MapSubmissionPlaceholder,
  User
} from '@momentum/constants';
import { Enum } from '@momentum/enum';

/**
 * Either a MapCredit with just the parts we need to handle filtering/editing
 * credits, or placeholder create data
 *
 * `user` is optional on MapCredit model so casting/explicit null checking
 * sometimes needed
 */
export interface EditableMapCredit {
  user: Partial<User>;
  type: MapCreditType;
  placeholder?: boolean;
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
  implements Record<MapCreditType, EditableMapCredit[]>
{
  [MapCreditType.AUTHOR]: EditableMapCredit[];
  [MapCreditType.CONTRIBUTOR]: EditableMapCredit[];
  [MapCreditType.TESTER]: EditableMapCredit[];
  [MapCreditType.SPECIAL_THANKS]: EditableMapCredit[];

  constructor() {
    this.clear();
  }

  set(credits: EditableMapCredit[], type?: MapCreditType): void {
    if (type === undefined) {
      this.clear();
      for (const credit of credits) {
        this[credit.type].push(credit);
      }
    } else {
      this[type] = credits;
    }
  }

  getAll(): EditableMapCredit[] {
    return this.values().flat();
  }

  getSubmittableRealUsers(): CreateMapCredit[] {
    return this.values()
      .flat()
      .filter(({ placeholder }) => !placeholder)
      .map(({ type, description, user: { id: userID } }) => ({
        userID,
        type,
        description
      }));
  }

  getSubmittablePlaceholders(): MapSubmissionPlaceholder[] {
    return this.values()
      .flat()
      .filter(({ placeholder }) => placeholder === true)
      .map(({ user: { alias }, type, description }) => ({
        alias,
        type,
        description
      }));
  }

  keys(): MapCreditType[] {
    return Enum.values(MapCreditType);
  }

  entries(): [MapCreditType, EditableMapCredit[]][] {
    return this.keys().map((k) => [k, this[k]]);
  }

  values(): EditableMapCredit[][] {
    return this.keys().map((k) => this[k]);
  }

  clear(): void {
    for (const key of this.keys()) {
      this[key] = [];
    }
  }
}

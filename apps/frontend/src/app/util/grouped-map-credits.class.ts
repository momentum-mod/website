import {
  CreateMapCredit,
  MapCredit,
  MapCreditType,
  MapSubmissionPlaceholder,
  STEAM_MISSING_AVATAR_URL
} from '@momentum/constants';
import * as Enum from '@momentum/enum';

/**
 * Either a MapCredit with just the parts we need to handle filtering/editing
 * credits, or placeholder create data
 */
export interface EditableMapCredit {
  type: MapCreditType;
  alias: string;
  avatarURL: string;
  placeholder: boolean;
  userID?: number;
  description?: string;
}

/**
 * Class wrapper for `MapCredit`s typed into separate areas based on their
 * `MapCreditType`. We need the arrays separated like this to use the CDK drag
 * and drop stuff.
 *
 * Using an Object rather than a Map for easier change detection
 */
export class GroupedMapCredits {
  private [MapCreditType.AUTHOR]: EditableMapCredit[] = [];
  private [MapCreditType.CONTRIBUTOR]: EditableMapCredit[] = [];
  private [MapCreditType.SPECIAL_THANKS]: EditableMapCredit[] = [];
  private [MapCreditType.TESTER]: EditableMapCredit[] = [];

  constructor(
    ...credits: Array<
      Array<
        | Omit<MapCredit, 'userID' | 'mapID'>
        | EditableMapCredit
        | MapSubmissionPlaceholder
      >
    >
  ) {
    if (!credits) return;

    credits
      .flat(2)
      .filter(Boolean)
      .forEach((credit) => this.add(credit));
  }

  add(
    credit:
      | Omit<MapCredit, 'userID' | 'mapID'>
      | EditableMapCredit
      | MapSubmissionPlaceholder
  ) {
    if ('placeholder' in credit) {
      // EditableMapCredit
      this[credit.type].push(credit);
    } else if ('alias' in credit) {
      // MapSubmissionPlaceholder
      this[credit.type].push({
        ...credit,
        placeholder: true,
        avatarURL: STEAM_MISSING_AVATAR_URL
      });
    } else {
      // MapCredit
      this[credit.type].push({
        ...credit,
        placeholder: false,
        alias: credit.user.alias,
        userID: credit.user.id,
        avatarURL: credit.user.avatarURL
      });
    }
  }

  get(type: MapCreditType): EditableMapCredit[] {
    return this[type];
  }

  getAll(): EditableMapCredit[] {
    return this.values().flat();
  }

  updateInnerTypes(): void {
    this.entries().forEach(([type, arr]) =>
      arr.forEach((credit) => (credit.type = type))
    );
  }

  getSubmittableRealUsers(): CreateMapCredit[] {
    return this.getAll()
      .filter(({ placeholder }) => !placeholder)
      .map(({ type, description, userID }) => ({
        userID,
        type,
        description
      }));
  }

  getSubmittablePlaceholders(): MapSubmissionPlaceholder[] {
    return this.getAll()
      .filter(({ placeholder }) => placeholder === true)
      .map(({ alias, type, description }) => ({
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

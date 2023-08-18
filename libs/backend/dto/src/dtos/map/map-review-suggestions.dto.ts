import { Gamemode, MapReviewSuggestions } from '@momentum/constants';
import { IsNumber, IsString } from 'class-validator';

export class GamemodeSuggestionsDto {
  @IsNumber()
  tier: number;

  @IsString()
  comment: string;

  @IsNumber()
  gameplayRating: number;
}

export class MapReviewSuggestionsDto implements MapReviewSuggestions {
  [track: number]: { [x in Gamemode]: GamemodeSuggestionsDto };
}

import {
  Gamemode,
  MapReviewSuggestion,
  MapSubmissionSuggestion,
  TrackType
} from '@momentum/constants';

export type GroupedMapSubmissionSuggestions = Map<
  Gamemode,
  Map<TrackType, MapSubmissionSuggestion[]>
>;

export type GroupedMapReviewSuggestions = Map<
  Gamemode,
  Map<TrackType, MapReviewSuggestion[]>
>;

export function groupMapSuggestions(
  suggs: MapSubmissionSuggestion[]
): GroupedMapSubmissionSuggestions;
export function groupMapSuggestions(
  suggs: MapReviewSuggestion[]
): GroupedMapReviewSuggestions;
export function groupMapSuggestions(
  suggs: MapSubmissionSuggestion[] | MapReviewSuggestion[]
): GroupedMapSubmissionSuggestions | GroupedMapReviewSuggestions {
  return new Map(
    // TODO: Remove once TS supports Map/Object.groupBy
    // @ts-expect-error Object.groupBy is mostly supported (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy#browser_compatibility)
    // but not in TS yet - we'll probably get in 5.4.
    [...Map.groupBy(suggs, ({ gamemode }) => gamemode).entries()].map(
      ([gamemode, suggs]) => [
        gamemode,
        // @ts-expect-error as above
        Map.groupBy(suggs, ({ trackType }) => trackType)
      ]
    )
  );
}

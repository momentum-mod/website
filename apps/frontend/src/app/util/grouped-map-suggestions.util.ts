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
    [
      ...Map.groupBy<Gamemode, MapSubmissionSuggestion | MapReviewSuggestion>(
        suggs,
        ({ gamemode }) => gamemode
      ).entries()
    ].map(([gamemode, suggs]) => [
      gamemode,
      Map.groupBy(suggs, ({ trackType }) => trackType)
    ])
  );
}

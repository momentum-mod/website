import { Component, forwardRef, input, computed, signal } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import {
  DisabledGamemodes,
  Gamemode,
  GamemodeDefaultUIStyle,
  GamemodeInfo,
  Leaderboard,
  LeaderboardType,
  MapSubmissionSuggestion,
  MapTag,
  mapTagEnglishName,
  MapTags,
  MapZones,
  MAX_MAP_SUGGESTION_COMMENT_LENGTH,
  TrackType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { NgClass } from '@angular/common';
import { Select } from '@openng/optimus-ui/select';
import { SelectModule } from '@openng/optimus-ui/select';
import { ChipsComponent } from '../../chips/chips.component';

@Component({
  selector: 'm-map-leaderboards-selection',
  templateUrl: 'map-leaderboards-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapLeaderboardSelectionComponent),
      multi: true
    }
  ],
  imports: [NgClass, Select, FormsModule, SelectModule, ChipsComponent]
})
export class MapLeaderboardSelectionComponent implements ControlValueAccessor {
  public readonly LeaderboardType = LeaderboardType;
  protected readonly Gamemodes = Enum.values(Gamemode)
    .filter((gamemode) => !DisabledGamemodes.has(gamemode))
    .map((gamemode) => ({
      gamemode,
      label: GamemodeInfo.get(gamemode).name
    }));

  protected readonly TrackType = TrackType;
  protected readonly TrackTypes = [
    { type: TrackType.MAIN, label: 'Main' },
    { type: TrackType.BONUS, label: 'Bonus' }
  ];
  protected readonly MapTags = MapTags;
  protected readonly MAX_MAP_SUGGESTION_COMMENT_LENGTH =
    MAX_MAP_SUGGESTION_COMMENT_LENGTH;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  // Items are edited in place by the template's ngModel bindings (always from
  // DOM events); the array itself is replaced through the signal.
  protected readonly value = signal<MapSubmissionSuggestion[]>([]);
  protected readonly disabled = signal(false);

  /** Set by the parent once zones have been loaded/parsed. */
  public readonly zones = signal<MapZones | null>(null);
  protected readonly availableBonusTracks = computed(
    () =>
      this.zones()?.tracks?.bonuses?.map((_, i) => ({
        label: i + 1,
        value: i + 1
      })) ?? []
  );

  readonly wasApproved = input(false);
  readonly mapLeaderboards = input<Leaderboard[]>();
  readonly defaultMode = input<Gamemode>();

  addEmptyItem() {
    if (this.disabled()) return;

    const hasMainTrack = this.value().some(
      ({ trackType }) => trackType === TrackType.MAIN
    );

    let trackNum = 1;
    let trackType: TrackType;
    if (!hasMainTrack) {
      trackType = TrackType.MAIN;
    } else {
      trackType = TrackType.BONUS;
      // Handle cases where we have Bonus 1, bonus 4, bonus 3, ...
      const bonusNums = new Set(
        this.value()
          .filter(({ trackType }) => trackType === TrackType.BONUS)
          .map(({ trackNum }) => trackNum)
      );

      trackNum = 1;
      while (bonusNums.has(trackNum)) trackNum++;
    }

    this.value.update((value) => [
      ...value,
      {
        gamemode: this.defaultMode() ?? Gamemode.AHOP,
        trackType,
        tier: 1,
        trackNum,
        type: LeaderboardType.RANKED,
        tags: []
      }
    ]);

    this.onChange(this.value());
    this.onTouched();
  }

  removeItem(index: number) {
    if (this.disabled()) return;

    this.value.update((value) => value.filter((_, i) => i !== index));

    this.onChange(this.value());
    this.onTouched();
  }

  updateRankedCheckbox(item: MapSubmissionSuggestion, isRanked: boolean) {
    item.type = isRanked ? LeaderboardType.RANKED : LeaderboardType.UNRANKED;
    this.onChange(this.value());
  }

  updateTags(item: MapSubmissionSuggestion, tags: MapTag[]) {
    item.tags = tags;
    this.onChange(this.value());
  }

  writeValue(value: MapSubmissionSuggestion[] | null): void {
    this.value.set(value ?? []);
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
  }

  onTrackTypeChange(item: MapSubmissionSuggestion) {
    if (item.trackType === TrackType.MAIN) {
      item.trackNum = 1;
    }
    this.onChange(this.value());
  }

  getTrackGamemodes(trackType: TrackType, trackNum: number) {
    const existingLbs = this.mapLeaderboards()
      .filter(
        (lb) =>
          lb.trackType === trackType &&
          lb.trackNum === trackNum &&
          !DisabledGamemodes.has(lb.gamemode) &&
          lb.style === GamemodeDefaultUIStyle.get(lb.gamemode)
      )
      .map(({ gamemode }) => ({
        gamemode,
        label: GamemodeInfo.get(gamemode).name
      }));
    if (existingLbs.length === 0) return this.Gamemodes;
    return existingLbs;
  }

  onChange: (value: MapSubmissionSuggestion[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

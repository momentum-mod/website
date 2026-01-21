import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import {
  DisabledGamemodes,
  Gamemode,
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
import { Select } from 'primeng/select';
import { SelectModule } from 'primeng/select';
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

  protected value: MapSubmissionSuggestion[] = [];
  protected disabled = false;

  availableBonusTracks: { label: number; value: number }[] = [];
  private _zones: MapZones | null = null;
  get zones() {
    return this._zones;
  }

  set zones(zones: MapZones | null) {
    this._zones = zones;
    this.availableBonusTracks =
      zones?.tracks?.bonuses?.map((_, i) => ({
        label: i + 1,
        value: i + 1
      })) ?? [];
  }

  @Input() wasApproved = false;
  @Input() mapLeaderboards?: Leaderboard[];
  @Input() defaultMode?: Gamemode;

  addEmptyItem() {
    if (this.disabled) return;

    const hasMainTrack = this.value.some(
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
        this.value
          .filter(({ trackType }) => trackType === TrackType.BONUS)
          .map(({ trackNum }) => trackNum)
      );

      trackNum = 1;
      while (bonusNums.has(trackNum)) trackNum++;
    }

    this.value.push({
      gamemode: this.defaultMode ?? Gamemode.AHOP,
      trackType,
      tier: 1,
      trackNum,
      type: LeaderboardType.RANKED,
      tags: []
    });

    this.onChange(this.value);
    this.onTouched();
  }

  removeItem(index: number) {
    if (this.disabled) return;

    this.value.splice(index, 1);

    this.onChange(this.value);
    this.onTouched();
  }

  updateRankedCheckbox(item: MapSubmissionSuggestion, isRanked: boolean) {
    item.type = isRanked ? LeaderboardType.RANKED : LeaderboardType.UNRANKED;
    this.onChange(this.value);
  }

  updateTags(item: MapSubmissionSuggestion, tags: MapTag[]) {
    item.tags = tags;
    this.onChange(this.value);
  }

  writeValue(value: MapSubmissionSuggestion[] | null): void {
    if (!value) {
      this.value = [];
    } else {
      this.value = value;
    }
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onTrackTypeChange(item: MapSubmissionSuggestion) {
    if (item.trackType === TrackType.MAIN) {
      item.trackNum = 1;
    }
    this.onChange(this.value);
  }

  getTrackGamemodes(trackType: TrackType, trackNum: number) {
    const existingLbs = this.mapLeaderboards
      .filter(
        (lb) =>
          lb.trackType === trackType &&
          lb.trackNum === trackNum &&
          !DisabledGamemodes.has(lb.gamemode)
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

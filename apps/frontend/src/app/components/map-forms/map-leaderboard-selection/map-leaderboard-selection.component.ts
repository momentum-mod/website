import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule
} from '@angular/forms';
import {
  Gamemode,
  GamemodeInfo,
  LeaderboardType,
  MapSubmissionSuggestion,
  MapTags,
  MapZones,
  MAX_MAP_SUGGESTION_COMMENT_LENGTH,
  TrackType
} from '@momentum/constants';
import { CommonModule } from '@angular/common';
import * as Enum from '@momentum/enum';
import { DropdownModule } from 'primeng/dropdown';
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
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, ChipsComponent]
})
export class MapLeaderboardSelectionComponent implements ControlValueAccessor {
  public readonly LeaderboardType = LeaderboardType;

  protected readonly Gamemodes = Enum.values(Gamemode).map((gamemode) => ({
    gamemode,
    label: GamemodeInfo.get(gamemode).name
  }));

  protected readonly TrackType = TrackType;
  protected readonly TrackTypes = [
    { type: TrackType.MAIN, label: 'Main' },
    { type: TrackType.BONUS, label: 'Bonus' }
  ];
  protected readonly MAX_MAP_SUGGESTION_COMMENT_LENGTH =
    MAX_MAP_SUGGESTION_COMMENT_LENGTH;

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

  setComment(item: MapSubmissionSuggestion, event: string) {
    if (event?.length > 0) {
      item.comment = event;
    }
    this.onChange(this.value);
  }

  removeItem(index: number) {
    if (this.disabled) return;

    this.value.splice(index, 1);

    this.onChange(this.value);
    this.onTouched();
  }

  getTags(gamemode: Gamemode) {
    return [...(MapTags.get(gamemode) ?? [])];
  }

  writeValue(value: MapSubmissionSuggestion[] | null): void {
    if (!value) {
      // Default value with empty gamemode/track selections whilst component
      // is default before zone init
      this.value = [
        { trackNum: 1, type: LeaderboardType.UNRANKED, tier: 1 } as any
      ];
    } else {
      this.value = value;
    }
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onChange: (value: MapSubmissionSuggestion[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  updateRankedCheckbox(item: MapSubmissionSuggestion, isRanked: boolean) {
    item.type = isRanked ? LeaderboardType.RANKED : LeaderboardType.UNRANKED;
    this.onChange(this.value);
  }
}

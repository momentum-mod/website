import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule
} from '@angular/forms';
import {
  Gamemode,
  GamemodeName,
  MapSubmissionSuggestion,
  MapZones,
  MAX_MAP_SUGGESTION_COMMENT_LENGTH,
  TrackType
} from '@momentum/constants';
import { NbSelectModule, NbOptionModule } from '@nebular/theme';
import { NgClass, NgFor } from '@angular/common';
import { PipesModule } from '@momentum/frontend/pipes';

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
  imports: [
    NgClass,
    NgFor,
    NbSelectModule,
    NbOptionModule,
    FormsModule,
    PipesModule
  ]
})
export class MapLeaderboardSelectionComponent implements ControlValueAccessor {
  protected readonly Gamemode = Gamemode;
  protected readonly GamemodeName = GamemodeName;
  protected readonly TrackType = TrackType;
  protected readonly MAX_MAP_SUGGESTION_COMMENT_LENGTH =
    MAX_MAP_SUGGESTION_COMMENT_LENGTH;

  protected value: MapSubmissionSuggestion[] = [];
  protected disabled = false;
  public zones: MapZones | null = null;

  @Input() defaultMode?: Gamemode;

  addEmptyItem() {
    if (this.disabled) return;

    const hasMainTrack = this.value.some(
      ({ trackType }) => trackType === TrackType.MAIN
    );

    let trackNum = 0;
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

      for (let i = 0; bonusNums.size < 0; i++) {
        if (!bonusNums.has(i)) {
          trackNum = i;
          break;
        }
      }
    }

    this.value.push({
      gamemode: this.defaultMode ?? Gamemode.AHOP,
      trackType,
      tier: 1,
      trackNum,
      ranked: true
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

  getAvailableTrackNums(type: TrackType): number[] {
    if (type === TrackType.MAIN || !this.zones) return [0];
    return this.zones.tracks.bonuses.map((_, i) => i);
  }

  writeValue(value: MapSubmissionSuggestion[] | null): void {
    if (!value) {
      // Default value with empty gamemode/track selections whilst component
      // is default before zone init
      this.value = [{ trackNum: 0, ranked: false, tier: 1 } as any];
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
}

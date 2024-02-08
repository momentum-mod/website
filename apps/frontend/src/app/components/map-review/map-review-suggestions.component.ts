import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule
} from '@angular/forms';
import {
  Gamemode,
  GamemodeName,
  IncompatibleGamemodes,
  MapReviewSuggestion,
  MMap,
  TrackType
} from '@momentum/constants';
import { CommonModule } from '@angular/common';
import { Enum } from '@momentum/enum';
import { DropdownModule } from 'primeng/dropdown';
import { groupMapLeaderboards } from '../../util';
import { MapSubmissionTypeInfoComponent } from '../tooltips/map-submission-type-tooltip.component';
import { IconComponent } from '../../icons';

@Component({
  selector: 'm-map-review-suggestions',
  templateUrl: 'map-review-suggestions.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapReviewSuggestionsComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    MapSubmissionTypeInfoComponent,
    IconComponent
  ]
})
export class MapReviewSuggestionsComponent implements ControlValueAccessor {
  protected readonly TrackType = TrackType;
  protected readonly TrackTypes = [
    { type: TrackType.MAIN, label: 'Main' },
    { type: TrackType.BONUS, label: 'Bonus' }
  ];

  protected value: MapReviewSuggestion[] = [];
  protected disabled = false;

  protected availableGamemodes: Array<{ gamemode: Gamemode; label: string }>;
  protected availableBonusTracks: Array<{ trackNum: number; label: string }> =
    [];
  protected defaultMode: Gamemode;
  private _map: MMap;
  get map() {
    return this._map;
  }
  @Input({ required: true })
  set map(map: MMap) {
    this._map = map;
    this.availableGamemodes = Enum.values(Gamemode)
      .filter(
        (gamemode: Gamemode) =>
          !this._map.submission.suggestions.some((sugg) =>
            IncompatibleGamemodes.get(sugg.gamemode).includes(gamemode)
          )
      )
      .map((gamemode: Gamemode) => ({
        gamemode,
        label: GamemodeName.get(gamemode)
      }));
    this.availableBonusTracks =
      (
        map?.zones ?? map?.submission?.currentVersion?.zones
      )?.tracks?.bonuses?.map((_, i) => ({
        trackNum: i,
        label: (i + 1).toString()
      })) ?? [];

    // Use leaderboards as this has sorting stuff for trying to determine
    // most important gamemode
    this.defaultMode = groupMapLeaderboards(map.leaderboards)[0].gamemode;

    // Reset
    this.writeValue(null);
  }

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
      gamemode: this.defaultMode ?? this.availableGamemodes[0].gamemode,
      trackType,
      trackNum,
      tier: null,
      gameplayRating: null
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

  writeValue(value: MapReviewSuggestion[] | null): void {
    if (!value) {
      this.value = [];
    } else {
      this.value = value;
    }
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onChange: (value: MapReviewSuggestion[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import {
  Gamemode,
  GamemodeInfo,
  IncompatibleGamemodes,
  MapReviewSuggestion,
  MapTag,
  mapTagEnglishName,
  MapTags,
  MMap,
  TrackType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { DropdownModule } from 'primeng/dropdown';
import { groupMapLeaderboards } from '../../util';
import { Select } from 'primeng/select';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { ChipsComponent } from '../chips/chips.component';

@Component({
  selector: 'm-map-review-suggestions-form',
  templateUrl: 'map-review-suggestions-form.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapReviewSuggestionsFormComponent),
      multi: true
    }
  ],
  imports: [
    DropdownModule,
    Select,
    FormsModule,
    ChipsComponent,
    IconComponent,
    TooltipDirective
  ]
})
export class MapReviewSuggestionsFormComponent implements ControlValueAccessor {
  protected readonly TrackType = TrackType;
  protected readonly TrackTypes = [
    { type: TrackType.MAIN, label: 'Main' },
    { type: TrackType.BONUS, label: 'Bonus' }
  ];
  protected readonly MapTags = MapTags;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  protected value: MapReviewSuggestion[] = [];
  protected disabled = false;

  protected availableGamemodes: Array<{ gamemode: Gamemode; label: string }>;
  protected availableBonusTracks: Array<{ trackNum: number; label: number }> =
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
            IncompatibleGamemodes.get(sugg.gamemode).has(gamemode)
          )
      )
      .map((gamemode: Gamemode) => ({
        gamemode,
        label: GamemodeInfo.get(gamemode).name
      }));
    this.availableBonusTracks =
      map?.currentVersion?.zones?.tracks?.bonuses?.map((_, i) => ({
        trackNum: i + 1,
        label: i + 1
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

      while (bonusNums.has(trackNum)) trackNum++;
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

  updateTags(item: MapReviewSuggestion, tags: MapTag[]) {
    item.tags = tags;
    this.onChange(this.value);
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

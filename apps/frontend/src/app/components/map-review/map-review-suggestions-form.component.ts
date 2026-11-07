import {
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  signal
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import {
  DisabledGamemodes,
  Gamemode,
  GamemodeInfo,
  MapReviewSuggestion,
  MapTag,
  mapTagEnglishName,
  MapTags,
  MMap,
  TrackType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { SelectModule } from '@openng/optimus-ui/select';
import { findMainGamemodeIndex, groupMapLeaderboards } from '../../util';
import { Select } from '@openng/optimus-ui/select';
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
    SelectModule,
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

  readonly map = input.required<MMap>();

  // Items are edited in place by the template's ngModel bindings (always from
  // DOM events). The list resets whenever the map input changes.
  protected readonly value = linkedSignal<MMap, MapReviewSuggestion[]>({
    source: this.map,
    computation: () => []
  });
  protected readonly disabled = signal(false);

  protected readonly availableGamemodes = Enum.values(Gamemode)
    .filter((gamemode: Gamemode) => !DisabledGamemodes.has(gamemode))
    .map((gamemode: Gamemode) => ({
      gamemode,
      label: GamemodeInfo.get(gamemode).name
    }));
  protected readonly availableBonusTracks = computed(
    () =>
      this.map()?.currentVersion?.zones?.tracks?.bonuses?.map((_, i) => ({
        trackNum: i + 1,
        label: i + 1
      })) ?? []
  );
  private readonly defaultMode = computed(() => {
    const map = this.map();
    const lbs = groupMapLeaderboards(map.leaderboards);
    return lbs[findMainGamemodeIndex(lbs, map.name)].gamemode;
  });

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

      while (bonusNums.has(trackNum)) trackNum++;
    }

    this.value.update((value) => [
      ...value,
      {
        gamemode: this.defaultMode() ?? this.availableGamemodes[0].gamemode,
        trackType,
        trackNum,
        tier: null,
        gameplayRating: null
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

  updateTags(item: MapReviewSuggestion, tags: MapTag[]) {
    item.tags = tags;
    this.onChange(this.value());
  }

  writeValue(value: MapReviewSuggestion[] | null): void {
    this.value.set(value ?? []);
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
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

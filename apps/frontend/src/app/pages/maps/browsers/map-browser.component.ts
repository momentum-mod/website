import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  Gamemode,
  Leaderboard,
  LeaderboardType,
  MapCreditName,
  MapCreditType,
  MapsGetAllQuery,
  MapSortType,
  MapSortTypeName,
  MapTag,
  mapTagEnglishName,
  MapTags,
  MMap,
  PagedResponse,
  TagQualifier,
  User
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';

import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, merge, of, Subject } from 'rxjs';
import {
  MapWithSpecificLeaderboard,
  groupMapLeaderboards,
  getSpecificGroupedLeaderboard
} from '../../../util';
import { setupPersistentForm } from '../../../util/form-utils.util';
import { MapListComponent } from '../../../components/map-list/map-list.component';
import { NStateButtonComponent } from '../../../components/n-state-button/n-state-button.component';
import { UserSelectComponent } from '../../../components/user-select/user-select.component';
import { SliderComponent } from '../../../components/slider/slider.component';
import { MapsService } from '../../../services/data/maps.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe, CommonModule, NgClass, NgStyle } from '@angular/common';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { DropdownComponent } from '../../../components/dropdown/dropdown.component';
import { ChipsComponent } from '../../../components/chips/chips.component';
import { IconComponent } from '../../../icons/icon.component';

type TagAndQualifier = [MapTag, TagQualifier];

@Component({
  templateUrl: 'map-browser.component.html',
  imports: [
    MapListComponent,
    NStateButtonComponent,
    UserSelectComponent,
    DropdownComponent,
    ChipsComponent,
    PaginatorModule,
    SliderComponent,
    ReactiveFormsModule,
    NgClass,
    NgStyle,
    AsyncPipe,
    TooltipDirective,
    CommonModule,
    FormsModule,
    IconComponent
  ]
})
export class MapBrowserComponent implements OnInit {
  protected readonly localUserService = inject(LocalUserService);
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly Gamemode = Gamemode;
  protected readonly LeaderboardType = LeaderboardType;

  // Set value as if submitter was last entry in MapCredit enum.
  protected readonly submitterCreditValue =
    Enum.fastLengthNumeric(MapCreditType);
  protected readonly MapCreditOptions = [
    ...Enum.fastValuesNumeric(MapCreditType),
    this.submitterCreditValue
  ];
  protected readonly MapCreditNameFn = (creditType: MapCreditType): string => {
    if (creditType === this.submitterCreditValue) {
      return 'Submitter';
    } else {
      return MapCreditName.get(creditType) ?? '';
    }
  };

  protected readonly MapSortOptions = [
    MapSortType.DATE_RELEASED_NEWEST,
    MapSortType.DATE_RELEASED_OLDEST,
    MapSortType.DATE_CREATED_NEWEST,
    MapSortType.DATE_CREATED_OLDEST,
    MapSortType.ALPHABETICAL,
    MapSortType.ALPHABETICAL_REVERSE,
    MapSortType.FAVORITED_MOST,
    MapSortType.FAVORITED_LEAST
  ];
  protected readonly MapSortNameFn = (sortType: MapSortType): string =>
    MapSortTypeName.get(sortType) ?? '';

  protected currentAllowedTAndQs = [];
  protected readonly TagQualifier = TagQualifier;
  protected readonly MapTagNameFn = (tagAndQualifier: TagAndQualifier) =>
    mapTagEnglishName(tagAndQualifier[0]);
  protected readonly MapTagIncludesFn = (
    arr: Array<TagAndQualifier>,
    tAndQ: TagAndQualifier
  ) => arr.some((elem) => elem[0] === tAndQ[0]); // Don't check qualifier.

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    gamemode: new FormControl<Gamemode>(null),
    tagsAndQualifiers: new FormControl<Array<TagAndQualifier>>(
      {
        value: [],
        disabled: true
      },
      { nonNullable: true }
    ),
    rankedUnranked: new FormControl<0 | 1 | 2>(
      { value: 0, disabled: true },
      { nonNullable: true }
    ),
    favorites: new FormControl<0 | 1 | 2>(0),
    pb: new FormControl<0 | 1 | 2>(0),
    tiers: new FormControl<[number, number]>({
      value: [1, 10],
      disabled: true
    }),
    credit: new FormControl<User | null>(null),
    creditType: new FormControl<number>(MapCreditType.AUTHOR),
    sortType: new FormControl<MapSortType>(this.MapSortOptions[0])
  });

  protected maps: Array<MapWithSpecificLeaderboard> = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  ngOnInit() {
    this.gamemode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.tiers[value != null ? 'enable' : 'disable']({ emitEvent: false });
        this.tagsAndQualifiers[value != null ? 'enable' : 'disable']({
          emitEvent: false
        });
        this.updateTagsAndQualifiers(value);
        this.rankedUnranked[value != null ? 'enable' : 'disable']({
          emitEvent: false
        });
      });

    // This will trigger gamemode observable as well, enabling/disabling filters.
    setupPersistentForm(this.filters, 'MAIN_MAPS_FILTERS', this.destroyRef);

    merge(
      of(this.initialItems),
      this.loadMore.pipe(
        filter(() => !this.loading),
        map(() => this.itemsPerLoad)
      ),
      this.filters.valueChanges.pipe(
        // Can't get this working, always previous value is always identical
        // to the current one.
        // Pretty rare that this operator is actually needed, leaving for now.
        // distinctUntilChanged(deepEquals),
        debounceTime(200),
        tap(() => {
          this.maps = [];
          this.skip = 0;
        }),
        map(() => this.initialItems)
      ) ?? EMPTY
    )
      .pipe(
        filter(() => this.filters.valid),
        tap(() => (this.loading = true)),
        switchMap((take) => {
          const {
            favorites,
            pb,
            tiers,
            name,
            gamemode,
            tagsAndQualifiers,
            rankedUnranked,
            credit,
            creditType,
            sortType
          } = this.filters.getRawValue();

          const options: MapsGetAllQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'inFavorites']
          };
          if (name) options.search = name;
          if (gamemode) {
            options.gamemode = gamemode;
            if (tiers) {
              const [low, high] = tiers;
              if (low > 1 && low <= 10) options.difficultyLow = low;
              if (high > 1 && high < 10) options.difficultyHigh = high;
            }
            if (tagsAndQualifiers.length > 0) {
              options.tagsWithQualifiers = tagsAndQualifiers.map(
                (tAndQ) => tAndQ[0].toString() + ';' + tAndQ[1].toString()
              );
            }
            if (rankedUnranked === 1) {
              options.leaderboardType = LeaderboardType.RANKED;
            } else if (rankedUnranked === 2) {
              options.leaderboardType = LeaderboardType.UNRANKED;
            }
          }
          if (favorites === 1) {
            options.favorite = true;
          } else if (favorites === 2) {
            options.favorite = false;
          }
          if (pb === 1) {
            options.PB = true;
          } else if (pb === 2) {
            options.PB = false;
          }
          if (credit) {
            if (creditType === this.submitterCreditValue) {
              options.submitterID = credit.id;
            } else {
              options.creditID = credit.id;
              options.creditType = creditType;
            }
          }
          if (sortType) options.sortType = sortType;

          return this.mapsService.getMaps({ ...options });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: PagedResponse<MMap & { leaderboards: Leaderboard[] }>) => {
          // Relying on switchMap relying here to guarantee the current gamemode
          // filter accurately corresponds to the this data.
          const currentMode = this.gamemode.value;
          this.maps.push(
            ...res.data.map((map) => {
              const ret = map as MapWithSpecificLeaderboard;
              ret.groupedLeaderboards = groupMapLeaderboards(map.leaderboards);
              if (currentMode) {
                ret.currentModeLeaderboards = getSpecificGroupedLeaderboard(
                  ret.groupedLeaderboards,
                  currentMode
                );
              }
              return ret;
            })
          );
          this.skip += res.returnCount;
          this.loading = false;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: httpError.error.message
          });
          this.loading = false;
        }
      });
  }

  resetFilters() {
    this.filters.reset({
      name: '',
      gamemode: null,
      tagsAndQualifiers: [],
      rankedUnranked: 0,
      favorites: 0,
      pb: 0,
      tiers: [1, 10],
      credit: null,
      creditType: MapCreditType.AUTHOR,
      sortType: this.MapSortOptions[0]
    });
  }

  get gamemode() {
    return this.filters.get('gamemode') as FormControl<Gamemode>;
  }

  get tiers() {
    return this.filters.get('tiers') as FormControl<[number, number]>;
  }

  get tagsAndQualifiers() {
    return this.filters.get('tagsAndQualifiers') as FormControl<
      Array<TagAndQualifier>
    >;
  }

  get rankedUnranked() {
    return this.filters.get('rankedUnranked') as FormControl<0 | 1 | 2>;
  }

  updateTagsAndQualifiers(gamemode: Gamemode | 0 | undefined | null) {
    this.currentAllowedTAndQs = (gamemode ? MapTags.get(gamemode) : []).map(
      (tag: MapTag) => [
        tag,
        TagQualifier.INCLUDE // Default to include.
      ]
    );

    this.tagsAndQualifiers.setValue(
      this.tagsAndQualifiers
        .getRawValue()
        .filter((tAndQ) =>
          this.MapTagIncludesFn(this.currentAllowedTAndQs, tAndQ)
        )
    );
  }

  toggleTagQualifier(index: number) {
    const arr = this.tagsAndQualifiers.value;
    arr[index][1] =
      arr[index][1] === TagQualifier.INCLUDE
        ? TagQualifier.EXCLUDE
        : TagQualifier.INCLUDE;
    this.tagsAndQualifiers.setValue(arr);
  }
}

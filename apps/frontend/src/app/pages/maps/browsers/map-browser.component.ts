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
  MMap,
  PagedResponse,
  User
} from '@momentum/constants';
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
import { IconComponent } from '../../../icons/icon.component';
import { fastValuesNumeric } from '@momentum/enum';

@Component({
  templateUrl: 'map-browser.component.html',
  imports: [
    MapListComponent,
    NStateButtonComponent,
    UserSelectComponent,
    DropdownComponent,
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

  protected readonly MapCreditOptions = fastValuesNumeric(MapCreditType);
  protected readonly MapCreditNameFn = (creditType: MapCreditType): string =>
    MapCreditName.get(creditType) ?? '';

  protected readonly MapSortOptions = [
    MapSortType.DATE_RELEASED_NEWEST,
    MapSortType.DATE_RELEASED_OLDEST,
    MapSortType.DATE_CREATED_NEWEST,
    MapSortType.DATE_CREATED_OLDEST,
    MapSortType.ALPHABETICAL,
    MapSortType.REVERSE_ALPHABETICAL,
    MapSortType.FAVORITED_MOST,
    MapSortType.FAVORITED_LEAST
  ];
  protected readonly MapSortNameFn = (sortType: MapSortType): string =>
    MapSortTypeName.get(sortType) ?? '';

  protected readonly filters = new FormGroup({
    name: new FormControl<string>(''),
    gamemode: new FormControl<Gamemode>(null),
    favorites: new FormControl<0 | 1 | 2>(0),
    pb: new FormControl<0 | 1 | 2>(0),
    tiers: new FormControl<[number, number]>({
      value: [1, 10],
      disabled: true
    }),
    credit: new FormControl<User | null>(null),
    creditType: new FormControl<MapCreditType>(MapCreditType.AUTHOR),
    sortType: new FormControl<MapSortType>(this.MapSortOptions[0])
  });

  protected maps: Array<MapWithSpecificLeaderboard> = [];

  private skip = 0;
  protected loading = false;
  protected loadMore = new Subject<void>();
  protected readonly initialItems = 16;
  protected readonly itemsPerLoad = 8;

  ngOnInit() {
    setupPersistentForm(this.filters, 'MAIN_MAPS_FILTERS', this.destroyRef);
    // Tier slider starts disabled.
    if (this.filters.value.gamemode) this.filters.controls.tiers.enable();

    this.gamemode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) =>
        this.tiers[value != null ? 'enable' : 'disable']({ emitEvent: false })
      );

    merge(
      of(this.initialItems),
      this.loadMore.pipe(
        filter(() => !this.loading),
        map(() => this.itemsPerLoad)
      ),
      this.filters?.valueChanges.pipe(
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
        filter(() => !this.filters || this.filters?.valid),
        tap(() => (this.loading = true)),
        switchMap((take) => {
          const {
            favorites,
            pb,
            tiers,
            name,
            gamemode,
            credit,
            creditType,
            sortType
          } = this.filters?.value ?? {};

          const options: MapsGetAllQuery = {
            skip: this.skip,
            take,
            expand: ['info', 'credits', 'leaderboards', 'inFavorites']
          };
          if (name) options.search = name;
          if (gamemode) options.gamemode = gamemode;
          if (tiers) {
            const [low, high] = tiers;
            if (low > 1 && low <= 10) options.difficultyLow = low;
            if (high > 1 && high < 10) options.difficultyHigh = high;
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
            options.creditID = credit.id;
            options.creditType = creditType;
          }
          if (sortType) options.sortType = sortType;

          return this.mapsService.getMaps({ ...options });
        }),
        tap(() => (this.loading = false)),
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
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching maps!',
            detail: httpError.error.message
          });
        }
      });
  }

  resetFilters() {
    this.filters.reset({
      name: '',
      gamemode: null,
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
}

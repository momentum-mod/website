import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { NbLayoutScrollService } from '@nebular/theme';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
import {
  MapStatus,
  MapStatusName,
  Gamemode,
  GamemodeName
} from '@momentum/constants';
import {
  MMap,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery
} from '@momentum/constants';
import { Enum } from '@momentum/enum';
import { SharedModule } from '../../../shared.module';
import { MapListItemComponent } from './map-list-item/map-list-item.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-map-list',
  templateUrl: './map-list.component.html',
  standalone: true,
  imports: [SharedModule, MapListItemComponent]
})
export class MapListComponent implements OnInit {
  @Input() isUpload = false;

  statuses: { value?: MapStatus; text: string }[] = [
    { value: undefined, text: 'All' },
    ...Enum.values(MapStatus)
      .map((status) => ({ value: status, text: MapStatusName.get(status) }))
      .sort((a, b) => (a.text > b.text ? 1 : -1))
  ];
  types: { value: Gamemode; text: string }[] = [
    { value: undefined, text: 'All' },
    ...Enum.values(Gamemode)
      .map((status) => ({ value: status, text: GamemodeName.get(status) }))
      .sort((a, b) => (a.text > b.text ? 1 : -1))
  ];

  requestSent = false;

  mapCount = 0;
  maps: MMap[] = [];
  pageLimit = 10;
  currentPage = 1;
  noMapsText: string;

  // TODO: TypeError when FormGroup weakening is removed.
  searchOptions: FormGroup = this.fb.group({
    search: [''],
    // TODO: Enable when map credits get reworked (#415)
    // 'author': [''],
    status: [],
    type: [],
    inLibrary: [false],
    inFavorites: [false]
  });

  lastSearch: {
    search: string;
    // TODO: Enable when map credits get reworked (#415)
    // author: string,
    status: number;
    type: number;
    inLibrary: boolean;
    inFavorites: boolean;
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly mapService: MapsService,
    private readonly messageService: MessageService,
    private readonly scrollService: NbLayoutScrollService,
    private readonly localUserService: LocalUserService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit() {
    this.noMapsText = this.isUpload
      ? 'You have not uploaded any maps with those search parameters.'
      : 'No maps with those search parameters found.';

    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.currentPage = +paramMap.get('page') || 1;
      const count = this.pageLimit * this.currentPage;
      if (count > this.mapCount) this.mapCount = count;
      this.loadMaps();
    });
  }

  // TODO: These types are ridiculous, but not worth messing with until we remove the map library system.
  genQueryParams():
    | UserMapLibraryGetQuery
    | UserMapFavoritesGetQuery
    | UserMapSubmittedGetQuery {
    this.lastSearch = this.searchOptions.value;

    const queryParams: Partial<UserMapLibraryGetQuery> = {
      expand: ['submitter', 'thumbnail', 'inFavorites'],
      take: this.pageLimit,
      skip: (this.currentPage - 1) * this.pageLimit
    };

    if (this.lastSearch.search) queryParams.search = this.lastSearch.search;
    // TODO: Enable when map credits get reworked (#415)
    // if (searchOptions.author)
    //   queryParams.author = this.lastSearch.author;
    // TODO: New API doesn't support these yet.
    // if (this.lastSearch.status !== null && this.lastSearch.status >= 0)
    //   queryParams.status = this.lastSearch.status;
    // if (this.lastSearch.type !== null && this.lastSearch.type >= 0)
    //   queryParams.type = this.lastSearch.type;
    return queryParams;
  }

  loadMaps() {
    const options = this.genQueryParams();
    let observer: Observable<any>;
    if (this.isUpload) {
      observer = this.localUserService.getSubmittedMaps(
        options as UserMapSubmittedGetQuery
      );
    } else if (
      this.searchOptions.value.inLibrary &&
      this.searchOptions.value.inFavorites
    ) {
      observer = this.localUserService
        .getMapLibrary(options as UserMapLibraryGetQuery)
        .pipe(
          map((res) => ({
            count: res.returnCount,
            response: res.data
              .filter((item) => item.map.favorites.length > 0)
              .map((item) => item.map)
          }))
        );
    } else if (this.searchOptions.value.inLibrary) {
      observer = this.localUserService.getMapLibrary(options as any).pipe(
        map((res) => ({
          count: res.returnCount,
          response: res.data.map((item) => item.map)
        }))
      );
    } else if (this.searchOptions.value.inFavorites) {
      observer = this.localUserService
        .getMapFavorites(options as UserMapFavoritesGetQuery)
        .pipe(
          map((res) => ({
            count: res.returnCount,
            response: res.data.map((item) => item.map)
          }))
        );
    } else {
      observer = this.mapService.getMaps(options);
    }

    observer.pipe(finalize(() => (this.requestSent = true))).subscribe({
      next: (res) => {
        this.mapCount = res.returnCount;
        this.maps = res.data;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to get maps',
          detail: err.message
        });
      }
    });
  }

  onPageChange(pageNum: number) {
    this.scrollService.scrollTo(0, 0);
    this.currentPage = pageNum;
    this.loadMaps();
  }

  isMapInLibrary(map: MMap): boolean {
    return this.searchOptions.value.inLibrary
      ? true
      : map.libraryEntries && map.libraryEntries.length > 0;
  }

  libraryUpdate(): void {
    if (this.searchOptions.value.inLibrary) {
      if (this.isLastItemInLastPage()) this.currentPage--;
      this.loadMaps();
    }
  }

  favoriteUpdate() {
    if (this.searchOptions.value.inFavorites) {
      if (this.isLastItemInLastPage()) this.currentPage--;
      this.loadMaps();
    }
  }

  isMapInFavorites(m: MMap) {
    return this.searchOptions.value.inFavorites
      ? true
      : m.favorites && m.favorites.length > 0;
  }

  isSearchFiltered(): boolean {
    const { search, status, type } = this.lastSearch;
    return (
      (search && search.length > 0) ||
      (status !== null && status >= 0) ||
      (type !== null && type >= 0)
    );
  }

  isLastItemInLastPage(): boolean {
    return (
      this.maps.length === 1 &&
      this.currentPage * this.pageLimit >= this.mapCount &&
      this.currentPage > 1
    );
  }
}

import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { NbLayoutScrollService, NbToastrService } from '@nebular/theme';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
import {
  MapStatus,
  MapStatusName,
  MapType,
  MapTypeName
} from '@momentum/constants';
import {
  Map,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery
} from '@momentum/types';
import { Enum } from '@momentum/enum';

export enum MapListType {
  BROWSE = 'browse',
  LIBRARY = 'library',
  FAVORITES = 'favorites',
  UPLOAD = 'uploads'
}

@Component({
  selector: 'mom-map-list',
  templateUrl: './map-list.component.html',
  styleUrls: ['./map-list.component.scss']
})
export class MapListComponent implements OnInit {
  @Input() type: MapListType;
  mapListType = MapListType;
  statuses: { value: MapStatus; text: string }[] = [];
  types: { value: MapType; text: string }[] = [];
  requestSent: boolean;
  mapCount: number;
  maps: Map[];
  pageLimit: number;
  currentPage: number;
  noMapsText: string;
  searchOptions: FormGroup = this.fb.group({
    search: [''],
    // TODO: Enable when map credits get reworked (#415)
    // 'author': [''],
    status: [],
    type: []
  });
  lastSearch: {
    search: string;
    // TODO: Enable when map credits get reworked (#415)
    // author: string,
    status: number;
    type: number;
  };

  constructor(
    private route: ActivatedRoute,
    private mapService: MapsService,
    private toasterService: NbToastrService,
    private scrollService: NbLayoutScrollService,
    private localUserService: LocalUserService,
    private fb: FormBuilder
  ) {
    this.pageLimit = 10;
    this.currentPage = 1;
    this.type = MapListType.BROWSE;
    this.requestSent = false;
    this.maps = [];
    this.mapCount = 0;

    this.statuses = [
      { value: -1, text: 'All' },
      ...Enum.values(MapStatus)
        .map((status) => ({ value: status, text: MapStatusName[status] }))
        .sort((a, b) => (a.text < b.text ? 1 : -1))
    ];

    this.types = [
      { value: -1, text: 'All' },
      ...Enum.values(MapType)
        .filter((status) => status !== MapType.UNKNOWN)
        .map((status) => ({ value: status, text: MapTypeName[status] }))
        .sort((a, b) => (a.text < b.text ? 1 : -1))
    ];
  }

  ngOnInit() {
    switch (this.type) {
      case MapListType.LIBRARY:
        this.noMapsText =
          'No maps with those search parameters found in your library.';
        break;
      case MapListType.FAVORITES:
        this.noMapsText =
          'No favorite maps with those search parameters found.';
        break;
      case MapListType.UPLOAD:
        this.noMapsText =
          'You have not uploaded any maps with those search parameters.';
        break;
      default:
        this.noMapsText = 'No maps with those search parameters found.';
        break;
    }
    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.currentPage = +paramMap.get('page') || 1;
      const count = this.pageLimit * this.currentPage;
      if (count > this.mapCount) this.mapCount = count;
      this.loadMaps();
    });
  }

  genQueryParams():
    | UserMapLibraryGetQuery
    | UserMapFavoritesGetQuery
    | UserMapSubmittedGetQuery {
    this.lastSearch = this.searchOptions.value;

    const queryParams: Partial<UserMapLibraryGetQuery> = {
      expand: ['info', 'submitter', 'thumbnail', 'inFavorites', 'inLibrary'],
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
    switch (this.type) {
      case MapListType.LIBRARY: {
        observer = this.localUserService.getMapLibrary(options).pipe(
          map((response) => ({
            count: response.totalCount,
            maps: response.response.map((val) => val.map)
          }))
        );

        break;
      }
      case MapListType.FAVORITES: {
        observer = this.localUserService.getMapFavorites(options).pipe(
          map((response) => ({
            count: response.totalCount,
            maps: response.response.map((val) => val.map)
          }))
        );

        break;
      }
      case MapListType.UPLOAD: {
        observer = this.localUserService.getSubmittedMaps(options);

        break;
      }
      default: {
        observer = this.mapService.getMaps(options);
      }
    }

    observer.pipe(finalize(() => (this.requestSent = true))).subscribe({
      next: (response) => {
        this.mapCount = response.totalCount;
        this.maps = response.response;
      },
      error: (error) =>
        this.toasterService.danger(
          error.message,
          `Failed to get ${
            this.type === MapListType.LIBRARY ? 'map library' : 'maps'
          }`
        )
    });
  }

  onPageChange(pageNum: number) {
    this.scrollService.scrollTo(0, 0);
    this.currentPage = pageNum;
    this.loadMaps();
  }

  isMapInLibrary(m: Map): boolean {
    return this.type === MapListType.LIBRARY
      ? true
      : m.libraryEntries && m.libraryEntries.length > 0;
  }

  libraryUpdate(): void {
    if (this.type === MapListType.LIBRARY) {
      if (this.isLastItemInLastPage()) this.currentPage--;
      this.loadMaps();
    }
  }

  favoriteUpdate() {
    if (this.type === MapListType.FAVORITES) {
      if (this.isLastItemInLastPage()) this.currentPage--;
      this.loadMaps();
    }
  }

  isMapInFavorites(m: Map) {
    return this.type === MapListType.FAVORITES
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

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
  statusEnums = [];
  typeEnums = [];
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
    private locUsrService: LocalUserService,
    private fb: FormBuilder
  ) {
    this.pageLimit = 10;
    this.currentPage = 1;
    this.type = MapListType.BROWSE;
    this.requestSent = false;
    this.maps = [];
    this.mapCount = 0;

    /*
     * Set statusEnums to be an array of objects that hold the enum values
     * and the strings we want to display in the dropdown menu
     * That way we can sort the items alphabetically without losing their values
     */
    let arr = Object.values(MapUploadStatus);
    // Enums are objects with keys/values mapped both ways in JS, so we discard half the results to keep only the keys
    arr = arr.slice(arr.length / 2);
    for (const i of arr) {
      this.statusEnums.push({
        value: Number(i),
        text: getStatusFromEnum(Number(i))
      });
    }
    // Sort items alphabetically
    this.statusEnums.sort((a, b) => (a.value > b.value ? 1 : -1));
    this.statusEnums.unshift({
      value: -1,
      text: 'All'
    });

    // Do the same for typeEnums
    // 'UNKNOWN' is thrown out in this case; should users be able to search for it as 'Other'?
    let arr2 = Object.values(MomentumMapType);
    arr2 = arr2.slice(arr2.length / 2);
    for (const i of arr2) {
      if (i !== MomentumMapType.UNKNOWN) {
        this.typeEnums.push({
          value: Number(i),
          text: getTypeFromEnum(Number(i))
        });
      }
    }
    this.typeEnums.sort((a, b) => (a.value > b.value ? 1 : -1));
    this.typeEnums.unshift({
      value: -1,
      text: 'All'
    });
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
    const queryParams: MapAPIQueryParams = {
      expand: 'info,submitter,thumbnail,inFavorites,inLibrary',
      limit: this.pageLimit,
      offset: (this.currentPage - 1) * this.pageLimit
    };
    if (this.lastSearch.search) queryParams.search = this.lastSearch.search;
    // TODO: Enable when map credits get reworked (#415)
    // if (searchOptions.author)
    //   queryParams.author = this.lastSearch.author;
    if (this.lastSearch.status !== null && this.lastSearch.status >= 0)
      queryParams.status = this.lastSearch.status;
    if (this.lastSearch.type !== null && this.lastSearch.type >= 0)
      queryParams.type = this.lastSearch.type;
    return queryParams;
  }

  loadMaps() {
    const options = { params: this.genQueryParams() };
    let observer: Observable<any>;
    switch (this.type) {
      case MapListType.LIBRARY: {
        observer = this.locUsrService.getMapLibrary(options).pipe(
          map((response) => ({
            count: response.count,
            maps: response.entries.map((val) => val.map)
          }))
        );

        break;
      }
      case MapListType.FAVORITES: {
        observer = this.locUsrService.getMapFavorites(options).pipe(
          map((response) => ({
            count: response.count,
            maps: response.favorites.map((val) => val.map)
          }))
        );

        break;
      }
      case MapListType.UPLOAD: {
        observer = this.locUsrService.getSubmittedMaps(options);

        break;
      }
      default: {
        observer = this.mapService.getMaps(options);
      }
    }

    observer.pipe(finalize(() => (this.requestSent = true))).subscribe({
      next: (response) => {
        this.mapCount = response.count;
        this.maps = response.maps;
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

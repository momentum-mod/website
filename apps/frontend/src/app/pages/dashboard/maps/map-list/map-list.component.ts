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
  Gamemode,
  MapTypeName
} from '@momentum/constants';
import {
  MMap,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery
} from '@momentum/constants';
import { Enum } from '@momentum/enum';

@Component({
  selector: 'mom-map-list',
  templateUrl: './map-list.component.html',
  styleUrls: ['./map-list.component.scss']
})
export class MapListComponent implements OnInit {
  @Input() isUpload: boolean;
  statuses: { value?: MapStatus; text: string }[] = [];
  types: { value: Gamemode; text: string }[] = [];
  requestSent: boolean;
  mapCount: number;
  maps: MMap[];
  pageLimit: number;
  currentPage: number;
  noMapsText: string;
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
    private route: ActivatedRoute,
    private mapService: MapsService,
    private toasterService: NbToastrService,
    private scrollService: NbLayoutScrollService,
    private localUserService: LocalUserService,
    private fb: FormBuilder
  ) {
    this.pageLimit = 10;
    this.currentPage = 1;
    this.isUpload = false;
    this.requestSent = false;
    this.maps = [];
    this.mapCount = 0;

    this.statuses = [
      { value: undefined, text: 'All' },
      ...Enum.values(MapStatus)
        .map((status) => ({ value: status, text: MapStatusName.get(status) }))
        .sort((a, b) => (a.text > b.text ? 1 : -1))
    ];

    this.types = [
      { value: undefined, text: 'All' },
      ...Enum.values(Gamemode)
        .filter((status) => status !== Gamemode.UNKNOWN)
        .map((status) => ({ value: status, text: MapTypeName.get(status) }))
        .sort((a, b) => (a.text > b.text ? 1 : -1))
    ];
  }

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
    if (this.isUpload) {
      observer = this.localUserService.getSubmittedMaps(options);
    } else if (
      this.searchOptions.value.inLibrary &&
      this.searchOptions.value.inFavorites
    ) {
      observer = this.localUserService.getMapLibrary(options).pipe(
        map((res) => ({
          count: res.returnCount,
          response: res.data
            .filter((item) => item.map.favorites.length > 0)
            .map((item) => item.map)
        }))
      );
    } else if (this.searchOptions.value.inLibrary) {
      observer = this.localUserService.getMapLibrary(options).pipe(
        map((res) => ({
          count: res.returnCount,
          response: res.data.map((item) => item.map)
        }))
      );
    } else if (this.searchOptions.value.inFavorites) {
      observer = this.localUserService.getMapFavorites(options).pipe(
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
        this.toasterService.danger(err.message, 'Failed to get maps');
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

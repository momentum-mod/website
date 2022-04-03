import {Component, Input, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MapsService} from '../../../../@core/data/maps.service';
import {MapAPIQueryParams} from '../../../../@core/models/map-api-query-params.model';
import {finalize, map} from 'rxjs/operators';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {Observable} from 'rxjs';
import {NbLayoutScrollService, NbToastrService} from '@nebular/theme';
import {MapUploadStatus, getStatusFromEnum} from '../../../../@core/models/map-upload-status.model';
import {MomentumMapType, getTypeFromEnum} from '../../../../@core/models/map-type.model';


export enum MapListType {
  TYPE_BROWSE = 'browse',
  TYPE_LIBRARY = 'library',
  TYPE_FAVORITES = 'favorites',
  TYPE_UPLOADS = 'uploads',
}

@Component({
  selector: 'map-list',
  templateUrl: './map-list.component.html',
  styleUrls: ['./map-list.component.scss'],
})
export class MapListComponent implements OnInit {

  @Input('type') type: MapListType;
  mapListType = MapListType;
  statusEnums = [];
  typeEnums = [];
  requestSent: boolean;
  mapCount: number;
  maps: MomentumMap[];
  pageLimit: number;
  currentPage: number;
  noMapsText: string;
  searchOptions: FormGroup = this.fb.group({
    'search': [''],
    // TODO: Enable when map credits get reworked (#415)
    // 'author': [''],
    'status': [],
    'type': [],
    'inLibrary': [false],
    'inFavorites': [false],
  });
  lastSearch: {
    search: string,
    // TODO: Enable when map credits get reworked (#415)
    // author: string,
    status: number,
    type: number,
  };

  constructor(private route: ActivatedRoute,
              private mapService: MapsService,
              private toasterService: NbToastrService,
              private scrollService: NbLayoutScrollService,
              private locUsrService: LocalUserService,
              private fb: FormBuilder) {
    this.pageLimit = 10;
    this.currentPage = 1;
    this.type = MapListType.TYPE_BROWSE;
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
        text: getStatusFromEnum(Number(i)),
      });
    }
    // Sort items alphabetically
    this.statusEnums.sort((a, b) => (a.value > b.value ? 1 : -1));
    this.statusEnums.unshift({
      value: -1,
      text: 'All',
    });

    // Do the same for typeEnums
    // 'UNKNOWN' is thrown out in this case; should users be able to search for it as 'Other'?
    let arr2 = Object.values(MomentumMapType);
    arr2 = arr2.slice(arr2.length / 2);
    for (const i of arr2) {
      if (i !== MomentumMapType.UNKNOWN) {
        this.typeEnums.push({
          value: Number(i),
          text: getTypeFromEnum(Number(i)),
        });
      }
    }
    this.typeEnums.sort((a, b) => (a.value > b.value ? 1 : -1));
    this.typeEnums.unshift({
      value: -1,
      text: 'All',
    });
  }

  ngOnInit() {
    switch (this.type) {
      case MapListType.TYPE_LIBRARY:
        this.noMapsText = 'No maps with those search parameters found in your library.';
        break;
      case MapListType.TYPE_FAVORITES:
        this.noMapsText = 'No favorite maps with those search parameters found.';
        break;
      case MapListType.TYPE_UPLOADS:
        this.noMapsText = 'You have not uploaded any maps with those search parameters.';
        break;
      default:
        this.noMapsText = 'No maps with those search parameters found.';
        break;
    }
    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.currentPage = +paramMap.get('page') || 1;
      const count = this.pageLimit * this.currentPage;
      if (count > this.mapCount)
        this.mapCount = count;
      this.loadMaps();
    });
  }

  genQueryParams(): MapAPIQueryParams {
    this.lastSearch = this.searchOptions.value;
    const queryParams: MapAPIQueryParams = {
      expand: 'info,submitter,thumbnail,inFavorites,inLibrary',
      limit: this.pageLimit,
      offset: (this.currentPage - 1) * this.pageLimit,
    };
    if (this.lastSearch.search)
      queryParams.search = this.lastSearch.search;
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
    const options = {params: this.genQueryParams()};
    let observer: Observable<any>;
    if (this.type === MapListType.TYPE_LIBRARY) {
      observer = this.locUsrService.getMapLibrary(options)
        .pipe(map(res => ({count: res.count, maps: res.entries.map(val => val.map)})));
    } else if (this.type === MapListType.TYPE_FAVORITES) {
      observer = this.locUsrService.getMapFavorites(options)
        .pipe(map(res => ({count: res.count, maps: res.favorites.map(val => val.map)})));
    } else if (this.type === MapListType.TYPE_UPLOADS) {
      observer = this.locUsrService.getSubmittedMaps(options);
    } else {
      observer = this.mapService.getMaps(options);
    }

    observer.pipe(finalize(() => this.requestSent = true))
      .subscribe(res => {
        this.mapCount = res.count;
        this.maps = res.maps;
      }, err => {
        this.toasterService.danger(err.message,
          `Failed to get ${this.type === MapListType.TYPE_LIBRARY ? 'map library' : 'maps'}`);
      });
  }

  onPageChange(pageNum: number) {
    this.scrollService.scrollTo(0, 0);
    this.currentPage = pageNum;
    this.loadMaps();
  }

  isMapInLibrary(m: MomentumMap): boolean {
    if (this.type === MapListType.TYPE_LIBRARY)
      return true;
    else
      return m.libraryEntries && m.libraryEntries.length > 0;
  }

  libraryUpdate(): void {
    if (this.type === MapListType.TYPE_LIBRARY) {
      if (this.isLastItemInLastPage())
        this.currentPage--;
      this.loadMaps();
    }
  }

  favoriteUpdate() {
    if (this.type === MapListType.TYPE_FAVORITES) {
      if (this.isLastItemInLastPage())
        this.currentPage--;
      this.loadMaps();
    }
  }

  isMapInFavorites(m: MomentumMap) {
    if (this.type === MapListType.TYPE_FAVORITES)
      return true;
    else
      return m.favorites && m.favorites.length > 0;
  }

  isSearchFiltered(): boolean {
    const {search, status, type} = this.lastSearch;
    return (search && search.length > 0) || (status !== null && status >= 0) || (type !== null && type >= 0);
  }

  isLastItemInLastPage(): boolean {
    return this.maps.length === 1 && this.currentPage * this.pageLimit >= this.mapCount && this.currentPage > 1;
  }
}

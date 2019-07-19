import {Component, Input, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MapsService} from '../../../../@core/data/maps.service';
import {MapAPIQueryParams} from '../../../../@core/models/map-api-query-params.model';
import {finalize, map} from 'rxjs/operators';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {Observable} from 'rxjs';
import {NbToastrService} from '@nebular/theme';
import {NbLayoutScrollService} from '@nebular/theme';

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

  requestSent: boolean;
  mapCount: number;
  maps: MomentumMap[];
  pageLimit: number;
  currentPage: number;
  searchOptions: FormGroup = this.fb.group({
    'search': [''],
  });

  constructor(private route: ActivatedRoute,
              private router: Router,
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
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.currentPage = +paramMap.get('page') || 1;
      this.loadMaps();
    });
  }

  genQueryParams(): MapAPIQueryParams {
    const searchOptions = this.searchOptions.value;
    const queryParams: MapAPIQueryParams = {
      expand: 'info,submitter,thumbnail,inFavorites,inLibrary',
      limit: this.pageLimit,
      offset: (this.currentPage - 1) * this.pageLimit,
    };
    if (searchOptions.search)
      queryParams.search = searchOptions.search;
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

  onPageChange(pageNum) {
    this.scrollService.scrollTo(0, 0);
    this.router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: {
          page: pageNum === 1 ? undefined : pageNum,
        },
        queryParamsHandling: 'merge',
      });
  }

  isMapInLibrary(m: MomentumMap): boolean {
    if (this.type === MapListType.TYPE_LIBRARY)
      return true;
    else
      return m.libraryEntries && m.libraryEntries.length > 0;
  }

  libraryUpdate(): void {
    if (this.type === MapListType.TYPE_LIBRARY)
      this.loadMaps();
  }

  favoriteUpdate() {
    if (this.type === MapListType.TYPE_FAVORITES)
      this.loadMaps();
  }

  isMapInFavorites(m: MomentumMap) {
    if (this.type === MapListType.TYPE_FAVORITES)
      return true;
    else
      return m.favorites && m.favorites.length > 0;
  }
}

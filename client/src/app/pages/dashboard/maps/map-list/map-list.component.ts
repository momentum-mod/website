import {Component, Input, OnInit, ɵAPP_ID_RANDOM_PROVIDER} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MapsService} from '../../../../@core/data/maps.service';
import {MapAPIQueryParams} from '../../../../@core/models/map-api-query-params.model';
import {finalize, map} from 'rxjs/operators';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {Observable} from 'rxjs';
import {NbLayoutScrollService, NbToastrService} from '@nebular/theme';
import {MapUploadStatus} from '../../../../@core/models/map-upload-status.model';
import {MomentumMapType} from '../../../../@core/models/map-type.model';


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

    // Set statusEnums to be an array of objects that hold the enum values and the strings we want to display in the dropdown menu
    let arr = Object.values(MapUploadStatus);
    // Enums are objects with keys/values mapped both ways in JS, so we discard half the results to keep only the keys
    arr = arr.slice(arr.length / 2);
    for (let i of arr) {
      this.statusEnums.push({
        value: Number(i),
        text: this.formatStatusEnum(Number(i))
      });
    }
    // Sort items alphabetically
    this.statusEnums.sort((a, b) => (a.value > b.value ? 1 : -1));
    this.statusEnums.unshift({
      value: -1,
      text: 'All'
    });

    // Do the same for typeEnums
    // 'UNKNOWN' is thrown out in this case should users be able to search it as 'Other'?
    let arr2 = Object.values(MomentumMapType);
    arr2 = arr2.slice(arr2.length / 2);
    for (let i of arr2) {
      if (i !== MomentumMapType.UNKNOWN) {
        this.typeEnums.push({
          value: Number(i),
          text: this.formatTypeEnum(Number(i))
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
    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.searchOptions.setValue({search: paramMap.get('search') || ''});
      this.currentPage = +paramMap.get('page') || 1;
      const count = this.pageLimit * this.currentPage;
      if (count > this.mapCount)
        this.mapCount = count;
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
          search: this.searchOptions.value.search || undefined,
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

  formatStatusEnum(key: number) {
    switch (key) {
      case MapUploadStatus.APPROVED:
        return 'Approved';
      case MapUploadStatus.PENDING:
        return 'Pending';
      case MapUploadStatus.NEEDS_REVISION:
        return 'Needs Revision';
      case MapUploadStatus.PRIVATE_TESTING:
        return 'Private Testing';
      case MapUploadStatus.PUBLIC_TESTING:
        return 'Public Testing';
      case MapUploadStatus.READY_FOR_RELEASE:
        return 'Ready for Release';
      case MapUploadStatus.REJECTED:
        return 'Rejected';
      case MapUploadStatus.REMOVED:
        return 'Removed';
      default:
        return MapUploadStatus[key];
    }
  }

  formatTypeEnum(key: number) {
    switch(key) {
      case MomentumMapType.SURF:
        return 'Surf';
      case MomentumMapType.BHOP:
        return 'Bunny Hop';
      case MomentumMapType.KZ:
        return 'Climb (KZ/XC)';
      case MomentumMapType.RJ:
        return 'Rocket Jump';
      case MomentumMapType.SJ:
        return 'Sticky Jump';
      case MomentumMapType.TRICKSURF:
        // Is it Tricksurf, TrickSurf, or Trick Surf?
        return 'Tricksurf';
      case MomentumMapType.AHOP:
        return 'Accelerated Hop';
      case MomentumMapType.PARKOUR:
        return 'Parkour';
      case MomentumMapType.CONC:
        return 'Conc';
      case MomentumMapType.DEFRAG:
        return 'Defrag';
      default:
        return MomentumMapType[key];
    }
  }

}

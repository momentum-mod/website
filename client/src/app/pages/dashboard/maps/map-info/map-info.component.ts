import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {MapsService} from '../../../../@core/data/maps.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {ToasterService} from 'angular2-toaster';
import {NgxGalleryAnimation, NgxGalleryImage, NgxGalleryOptions} from 'ngx-gallery';
import {MapImage} from '../../../../@core/models/map-image.model';
import {Permission} from '../../../../@core/models/permissions.model';


@Component({
  selector: 'map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
})

export class MapInfoComponent implements OnInit {

  @ViewChild('leaderboard') leaderboard;
  map: MomentumMap;
  mapInLibrary: boolean;
  mapInFavorites: boolean;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  galleryOptions: NgxGalleryOptions[];
  galleryImages: NgxGalleryImage[];

  constructor(private route: ActivatedRoute,
              private router: Router,
              private mapService: MapsService,
              private locUserService: LocalUserService,
              private toastService: ToasterService) {
    this.mapInLibrary = false;
    this.mapInFavorites = false;
    this.galleryOptions = [
      {
        width: '100%',
        height: '400px',
        thumbnailsColumns: 4,
        imageAnimation: NgxGalleryAnimation.Slide,
        previewCloseOnClick: true,
        previewCloseOnEsc: true,
      },
      // max-width 800
      {
        breakpoint: 800,
        width: '100%',
        height: '300px',
        imagePercent: 80,
        thumbnailsPercent: 20,
        thumbnailsMargin: 20,
        thumbnailMargin: 20,
      },
      // max-width 400
      {
        breakpoint: 400,
        preview: false,
      },
    ];
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
          this.mapService.getMap(Number(params.get('id')), {
            params: { expand: 'info,credits,submitter,stats,images' },
          }),
      ),
    ).subscribe(map => {
      this.map = map;
      this.map.images = [{
        id: 0,
        mapID: map.id,
        URL: map.info.avatarURL,
      }].concat(this.map.images);
      this.updateGalleryImages(map.images);
      this.leaderboard.loadLeaderboardRuns(map.id);
      this.locUserService.isMapInLibrary(map.id).subscribe(() => {
        this.mapInLibrary = true;
      }, error => {
        this.mapInLibrary = error.status !== 404;
      });
      this.locUserService.getMapFavorite(map.id).subscribe(mapFavorite => {
        this.mapInFavorites = true;
      });
      this.locUserService.getLocal().subscribe(locUser => {
        this.isAdmin = this.locUserService.hasPermission(Permission.ADMIN, locUser);
        this.isModerator = this.locUserService.hasPermission(Permission.MODERATOR, locUser);
        if (this.map.submitterID === locUser.id)
          this.isSubmitter = true;
      });
    });
  }

  onLibraryUpdate() {
    if (this.mapInLibrary) {
      this.locUserService.removeMapFromLibrary(this.map.id).subscribe(() => {
        this.mapInLibrary = false;
        this.map.stats.totalSubscriptions--;
      });
    } else {
      this.locUserService.addMapToLibrary(this.map.id).subscribe(resp => {
        this.mapInLibrary = true;
        this.map.stats.totalSubscriptions++;
      }, error => {
        this.toastService.popAsync('error', 'Cannot add map to library', error.message);
      });
    }
  }

  onFavoriteUpdate() {
    if (this.mapInFavorites) {
      this.locUserService.removeMapFromFavorites(this.map.id).subscribe(() => {
        this.mapInFavorites = false;
        this.map.stats.totalFavorites--;
      });
    } else {
      this.locUserService.addMapToFavorites(this.map.id).subscribe(resp => {
        this.mapInFavorites = true;
        this.map.stats.totalFavorites++;
      }, error => {
        this.toastService.popAsync('error', 'Failed to add map to favorites', error.message);
      });
    }
  }

  updateGalleryImages(mapImages: MapImage[]) {
    this.galleryImages = [];
    for (let i = 0; i < mapImages.length; i++) {
      this.galleryImages.push({
        small: mapImages[i].URL,
        medium: mapImages[i].URL,
        big: mapImages[i].URL,
      });
    }
  }

  onEditMap() {
    this.router.navigate(['/dashboard/maps/' + this.map.id + '/edit']);
  }

}

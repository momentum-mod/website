import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import {
  MapStatuses,
  DateString,
  MapCreditNames,
  MapCreditType,
  MapImage,
  MapNotify,
  MapStatusName,
  MapStatus,
  MMap,
  ReportType
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { SharedModule } from '../../../shared.module';
import { MapLeaderboardComponent } from './map-leaderboard/map-leaderboard.component';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';
import { GroupedMapCredits, GroupedMapLeaderboards } from '../../../util';
import * as Enum from '@momentum/enum';
import { MapSubmissionComponent } from './map-submission/map-submission.component';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../../services/title.service';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { downloadZoneFile } from '../../../util/download-zone-file.util';
import { ReportButtonComponent } from '../../../components/report/report-button/report-button.component';
import { TabsComponent } from '../../../components/tabs/tabs.component';
import {
  TabComponent,
  TabDirective
} from '../../../components/tabs/tab.component';
import {
  GalleryComponent,
  GalleryItem
} from '../../../components/gallery/gallery.component';
import { FontSizeLerpDirective } from '../../../directives/font-size-lerp.directive';
import { MapsService } from '../../../services/data/maps.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { LayoutService } from '../../../services/layout.service';

/**
 * Using an m-tabs for this page doesn't work with the layout, we use this to
 * explicitly enumerate possible RHS sections.
 */
enum MapInfoSection {
  SUBMISSION = 1,
  LEADERBOARDS = 2
}

@Component({
  selector: 'm-map-info',
  templateUrl: './map-info.component.html',
  standalone: true,
  imports: [
    SharedModule,
    MapLeaderboardComponent,
    MapSubmissionComponent,
    ReportButtonComponent,
    TabsComponent,
    TabDirective,
    TabComponent,
    FontSizeLerpDirective,
    OverlayPanelModule,
    GalleryComponent
  ]
})
export class MapInfoComponent implements OnInit {
  protected readonly ReportType = ReportType;
  protected readonly MapStatus = MapStatus;
  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;
  protected readonly MapInfoSection = MapInfoSection;
  protected readonly MapStatusName = MapStatusName;
  protected readonly downloadZoneFile = downloadZoneFile;

  protected loading = false;
  protected displayFullscreenGallery = false;

  map: MMap;

  name: string;
  prefix: string | null;
  leaderboards: GroupedMapLeaderboards;
  credits: GroupedMapCredits;
  images: GalleryItem[];
  selectedImage: GalleryItem;

  notify: MapNotify;
  notifications = false;
  inFavorites = false;
  isSubmitter: boolean;
  inSubmission: boolean;

  currentSection?: MapInfoSection = null;
  sections = Enum.values(MapInfoSection);

  constructor(
    protected readonly localUserService: LocalUserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly mapService: MapsService,
    private readonly messageService: MessageService,
    private readonly dialogService: DialogService,
    private readonly layoutService: LayoutService,
    private readonly sanitizer: DomSanitizer,
    private readonly destroyRef: DestroyRef,
    private readonly titleService: TitleService
  ) {}

  ngOnInit() {
    this.layoutService.reserveBackgroundUrl(
      /\/maps\/(?!beta|submissions)[\w-]+\/?$/
    );

    this.route.paramMap
      .pipe(
        tap(() => (this.loading = true)),
        switchMap((params: ParamMap) =>
          this.mapService.getMap(params.get('name'), {
            expand: [
              'info',
              'leaderboards',
              'credits',
              'submitter',
              'stats',
              'inFavorites',
              'submission',
              'versions',
              // Map review system needs zones to work, so we have to fetch
              // zones. This is very annoying; we'd really rather avoid
              // having to fetch so much data. However, we don't know whether
              // we map review stuff prior to response to this query since we
              // don't know the status. Maybe worth rethinking in future.
              'currentVersionWithZones'
            ]
          })
        ),
        tap(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (map) => this.setMap(map),
        error: () => this.router.navigate(['/404'])
      });
  }

  setMap(map: MMap) {
    this.map = map;

    if (!map) this.router.navigate(['/404']);

    this.titleService.setTitle(this.map.name);

    const [name, prefix] = extractPrefixFromMapName(map.name);
    this.name = name;
    this.prefix = prefix;
    this.credits = new GroupedMapCredits(
      this.map.credits ?? [],
      MapStatuses.IN_SUBMISSION.includes(this.map.status)
        ? (this.map.submission?.placeholders ?? [])
        : []
    );
    this.inSubmission = MapStatuses.IN_SUBMISSION.includes(map.status);
    // Show Review section first if in review, otherwise leaderboards (and the
    // tab view won't be visible anyway).
    this.currentSection = this.inSubmission
      ? MapInfoSection.SUBMISSION
      : MapInfoSection.LEADERBOARDS;

    this.setImages(this.map.images, this.map.info.youtubeID);

    this.layoutService.setBackgroundImage(this.map.thumbnail?.large);

    if (this.localUserService.isLoggedIn) {
      this.localUserService.checkMapNotify(this.map.id).subscribe({
        next: (resp) => {
          this.notify = resp;
          if (resp) this.notifications = true;
        },
        error: (error) => {
          if (error.status !== 404)
            this.messageService.add({
              severity: 'error',
              summary: 'Could not check if following',
              detail: error.message
            });
        }
      });
    }

    // In favourites iff num mapfavorites entries for user > 0. sorry
    this.inFavorites = this.map.favorites?.length > 0;

    this.isSubmitter =
      this.map.submitterID === this.localUserService.user.value?.id;
  }

  setImages(images: MapImage[], youtubeID?: string) {
    this.images = images.map(({ small, large }) => ({
      type: 'image',
      full: large,
      thumbnail: small
    }));

    if (youtubeID) {
      this.images.unshift({
        type: 'youtube',
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${youtubeID}`
        ),
        safeThumbnail: this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://img.youtube.com/vi/${youtubeID}/mqdefault.jpg`
        )
      });
    }

    this.selectedImage = this.images[0];
  }

  toggleFavorite() {
    if (this.inFavorites) {
      this.localUserService
        .removeMapFromFavorites(this.map.id)
        .subscribe(() => {
          this.inFavorites = false;
          this.map.stats.favorites--;
        });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.inFavorites = true;
          this.map.stats.favorites++;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to favorites',
            detail: error.message
          })
      });
    }
  }

  editNotificationSettings() {
    this.dialogService
      .open(MapNotifyEditComponent, {
        header: 'Edit map notification',
        data: {
          flags: this.notify ? this.notify.notifyOn : 0
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        if (response.newFlags === 0) {
          if (!this.notify) return;
          this.localUserService.disableMapNotify(this.map.id).subscribe({
            next: () => {
              this.notify.notifyOn = 0;
              this.notifications = false;
            },
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Could not disable notifications',
                detail: error.message
              })
          });
        } else {
          this.localUserService
            .updateMapNotify(this.map.id, response.newFlags)
            .subscribe({
              next: (response) => {
                this.notifications = true;
                if (!this.notify) this.notify = response;
                else this.notify.notifyOn = response.newFlags;
              },
              error: (error) =>
                this.messageService.add({
                  severity: 'error',
                  summary: error.message,
                  detail: 'Could not enable notificaions'
                })
            });
        }
      });
  }

  toggleMapBackground(): void {
    this.layoutService.toggleBackgroundEnable();
  }

  // TODO: https://github.com/momentum-mod/website/issues/903
  getLatestStatusChangeDate(status: MapStatus): DateString {
    return this.map.submission.dates.findLast((date) => date.status === status)
      ?.date;
  }
}

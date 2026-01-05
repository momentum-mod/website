import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import {
  MapStatuses,
  MapCreditNames,
  MapCreditType,
  MapImage,
  MapNotify,
  MapStatusName,
  MapStatus,
  MMap,
  ReportType,
  SteamGamesNames,
  SteamGamesImages
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

import { MapLeaderboardComponent } from './map-leaderboard/map-leaderboard.component';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';
import { GroupedMapCredits, GroupedMapLeaderboards } from '../../../util';
import * as Enum from '@momentum/enum';
import { MapSubmissionComponent } from './map-submission/map-submission.component';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../../services/title.service';
import { downloadZoneFile } from '../../../util/download-zone-file.util';
import { ReportButtonComponent } from '../../../components/report/report-button/report-button.component';

import {
  GalleryComponent,
  GalleryItem
} from '../../../components/gallery/gallery.component';
import { FontSizeLerpDirective } from '../../../directives/font-size-lerp.directive';
import { MapsService } from '../../../services/data/maps.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { LayoutService } from '../../../services/layout.service';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { SpinnerComponent } from '../../../components/spinner/spinner.component';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { IconComponent } from '../../../icons';
import { Popover } from 'primeng/popover';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { PluralPipe } from '../../../pipes/plural.pipe';
import { ThousandsSuffixPipe } from '../../../pipes/thousands-suffix.pipe';
import { AvatarComponent } from '../../../components/avatar/avatar.component';

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
  imports: [
    MapLeaderboardComponent,
    MapSubmissionComponent,
    ReportButtonComponent,
    FontSizeLerpDirective,
    GalleryComponent,
    TooltipDirective,
    SpinnerComponent,
    NgClass,
    IconComponent,
    RouterLink,
    Popover,
    SpinnerDirective,
    DatePipe,
    PluralPipe,
    ThousandsSuffixPipe,
    AvatarComponent,
    CommonModule
  ]
})
export class MapInfoComponent implements OnInit {
  protected readonly localUserService = inject(LocalUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly layoutService = inject(LayoutService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(TitleService);

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
  requiredGamesNames: string[];
  requiredGamesImages: string[];

  notify: MapNotify;
  notifications = false;
  inFavorites = false;
  isSubmitter: boolean;
  inSubmission: boolean;

  currentSection = MapInfoSection.SUBMISSION;
  sections = Enum.values(MapInfoSection);

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
              'reviewStats',
              // Map review system needs zones to work, so we have to fetch
              // zones. This is very annoying; we'd really rather avoid
              // having to fetch so much data. However, we don't know whether
              // we map review stuff prior to response to this query since we
              // don't know the status. Maybe worth rethinking in future.
              'currentVersionWithZones'
            ]
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (map) => {
          this.setMap(map);
          this.loading = false;
        },
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
      this.map.submission?.placeholders ?? []
    );
    this.inSubmission = MapStatuses.IN_SUBMISSION.includes(map.status);
    // Show Review section first if in review, otherwise leaderboards.
    this.currentSection =
      this.map.status === MapStatus.APPROVED
        ? MapInfoSection.LEADERBOARDS
        : MapInfoSection.SUBMISSION;

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

    this.requiredGamesNames = this.map.info.requiredGames.map(
      (app) => SteamGamesNames.get(app) ?? app.toString()
    );
    this.requiredGamesImages = this.map.info.requiredGames
      .map((app) => SteamGamesImages.get(app) ?? null)
      .filter((url) => Boolean(url));

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
          `https://www.youtube.com/embed/${youtubeID}?enablejsapi=1`
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
}

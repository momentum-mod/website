import {
  MapImage,
  MapNotify,
  ReportType
} from '@momentum/constants';
import { PartialDeep } from 'type-fest';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { TabViewModule } from 'primeng/tabview';
import {
  AvatarComponent,
} from '../../../components';
import { SharedModule } from '../../../shared.module';
import { MapLeaderboardComponent } from './map-leaderboard/map-leaderboard.component';
import { MapNotifyEditComponent } from './map-info-notify-edit/map-info-notify-edit.component';

@Component({
  selector: 'm-map-info',
  templateUrl: './map-info.component.html',
  standalone: true,
  imports: [
    SharedModule,
    MapLeaderboardComponent,
    ReportButtonComponent,
    CardHeaderComponent,
    CardComponent,
    TooltipDirective,
    TabViewModule,
    AvatarComponent,
    PluralPipe,
    ThousandsSuffixPipe,
  ]
})
  protected readonly ReportType = ReportType;


  @Input() previewMap: PartialDeep<
    { map: MMap; images: MapImage[] },
    { recurseIntoArrays: true }
  >;
  map: MMap;
  mapNotify: MapNotify;
  mapNotifications = false;
  isSubmitter: boolean;
  isModerator: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly mapService: MapsService,
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService,
    private readonly dialogService: DialogService,
  ) {}

  ngOnInit() {

    if (this.previewMap) {
      this.map = this.previewMap.map as MMap;
    } else {
      this.route.paramMap
        .pipe(
          switchMap((params: ParamMap) =>
            this.mapService.getMap(Number(params.get('id')), {
              expand: [
                'info',
                'zones',
                'leaderboards',
                'credits',
                'submitter',
                'stats',
                'images',
                'inFavorites',
              ]
            })
        )
    }
  }


          this.messageService.add({
            detail: error.message
  }

      this.localUserService
        .removeMapFromFavorites(this.map.id)
        .subscribe(() => {
          this.map.stats.favorites--;
        });
    } else {
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
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
          flags: this.mapNotify ? this.mapNotify.notifyOn : 0
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        if (response.newFlags === 0) {
          if (!this.mapNotify) return;
          this.localUserService.disableMapNotify(this.map.id).subscribe({
            next: () => {
              this.mapNotify.notifyOn = 0;
              this.mapNotifications = false;
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
                this.mapNotifications = true;
                if (!this.mapNotify) this.mapNotify = response;
                else this.mapNotify.notifyOn = response.newFlags;
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

  }

  }
}

import {
  LeaderboardRun,
  MMap,
  PagedResponse,
  TrackType
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { SharedModule } from '../../../../shared.module';
import { LeaderboardsService } from '../../../../services';
import { TimeAgoPipe, TimingPipe } from '../../../../pipes';

enum LeaderboardType {
}

@Component({
  selector: 'm-map-leaderboard',
  standalone: true,
  imports: [
    SharedModule,
    DropdownModule,
    AvatarComponent,
    TimingPipe,
  ]
})
  protected readonly LeaderboardType = LeaderboardType;

  }


  constructor(
    private readonly leaderboardService: LeaderboardsService,
    private readonly messageService: MessageService
      .subscribe({
        next: (response) => {
          this.leaderboardRuns = response.data;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
            summary: 'Could not find runs'
          })
      });
  }

  }
}

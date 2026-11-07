import { Component, computed, inject } from '@angular/core';
import { ProgressBarModule } from '@openng/optimus-ui/progressbar';
import { LevelIndicatorComponent } from '../level-indicator/level-indicator.component';
import { XpSystemsService } from '../../services/xp-systems.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import {
  FullUser,
  LocalUserService
} from '../../services/data/local-user.service';

@Component({
  selector: 'm-player-card',
  imports: [ProgressBarModule, LevelIndicatorComponent],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css'
})
export class PlayerCardComponent {
  private readonly localUserService = inject(LocalUserService);
  private readonly xpService = inject(XpSystemsService);
  protected readonly user = toSignal<FullUser>(
    this.localUserService.user.pipe(filter(Boolean))
  );
  protected readonly level = computed(() => this.user()?.userStats.level);
  protected readonly xp = computed(() => this.user()?.userStats.cosXP);
  protected readonly currLevelXp = computed(() =>
    this.user() ? this.xpService.getCosmeticXpForLevel(this.level()) : 0
  );
  protected readonly nextLevelXp = computed(() =>
    this.user() ? this.xpService.getCosmeticXpForLevel(this.level() + 1) : 0
  );
}

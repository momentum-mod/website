import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { LevelIndicatorComponent } from '../level-indicator/level-indicator.component';
import { XpSystemsService } from '../../services/xp-systems.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class PlayerCardComponent implements OnInit {
  private readonly localUserService = inject(LocalUserService);
  private readonly xpService = inject(XpSystemsService);
  private readonly destroyRef = inject(DestroyRef);

  protected user?: FullUser;
  protected level = 0;
  protected xp = 0;
  protected currLevelXp = 0;
  protected nextLevelXp = 0;

  ngOnInit() {
    this.localUserService.user
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user: FullUser | null) => {
        if (!user || !user.userStats) return;
        this.user = user;
        this.level = user.userStats.level;
        this.xp = user.userStats.cosXP;
        this.currLevelXp = this.xpService.getCosmeticXpForLevel(this.level);
        this.nextLevelXp = this.xpService.getCosmeticXpForLevel(this.level + 1);
      });
  }
}

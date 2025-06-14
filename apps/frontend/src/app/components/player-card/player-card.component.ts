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

  protected user: FullUser;
  protected level: number;
  protected xp: number;
  protected currLevelXp: number;
  protected nextLevelXp: number;

  ngOnInit() {
    this.localUserService.user
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user: FullUser | null) => {
        if (!user) return;
        this.user = user;
        this.level = user.userStats.level;
        this.xp = user.userStats.cosXP;
        this.currLevelXp = this.xpService.getCosmeticXpForLevel(this.level);
        this.nextLevelXp = this.xpService.getCosmeticXpForLevel(this.level + 1);
      });
  }
}

import { Component, DestroyRef, OnInit } from '@angular/core';
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
  protected user: FullUser;
  protected level: number;
  protected xp: number;
  protected currLevelXp: number;
  protected nextLevelXp: number;

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly xpService: XpSystemsService,
    private readonly destroyRef: DestroyRef
  ) {}

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

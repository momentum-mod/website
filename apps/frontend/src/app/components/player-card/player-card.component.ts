import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { IconComponent } from '../../icons';
import { ProgressBarModule } from 'primeng/progressbar';
import { XpSystemsService } from '../../services/xp-systems.service';
import { FullUser, LocalUserService } from '../../services';

@Component({
  selector: 'm-player-card',
  standalone: true,
  imports: [IconComponent, ProgressBarModule],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css'
})
export class PlayerCardComponent implements OnInit, OnDestroy {
  protected user: FullUser;
  protected level: number;
  protected xp: number;
  protected currLevelXp: number;
  protected nextLevelXp: number;

  private readonly ngUnsub = new Subject<void>();

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly xpService: XpSystemsService
  ) {}

  ngOnInit() {
    this.localUserService.localUserSubject
      .pipe(takeUntil(this.ngUnsub))
      .subscribe((user: FullUser) => {
        this.user = user;
        this.level = user.userStats.level;
        this.xp = user.userStats.cosXP as number;
        this.currLevelXp = this.xpService.getCosmeticXpForLevel(this.level);
        this.nextLevelXp = this.xpService.getCosmeticXpForLevel(this.level + 1);
      });
  }

  ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }
}

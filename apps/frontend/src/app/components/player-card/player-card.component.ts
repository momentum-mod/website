import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
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

  protected readonly user = signal<FullUser | undefined>(undefined);
  protected readonly level = computed(() => this.user()?.userStats.level);
  protected readonly xp = computed(() => this.user()?.userStats.cosXP);
  protected readonly currLevelXp = computed(() =>
    this.xpService.getCosmeticXpForLevel(this.level())
  );
  protected readonly nextLevelXp = computed(() =>
    this.xpService.getCosmeticXpForLevel(this.level() + 1)
  );

  ngOnInit() {
    this.localUserService.user
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user: FullUser | null) => {
        if (!user) return;
        this.user.set(user);
      });
  }
}

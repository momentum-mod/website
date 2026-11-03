import { Component, computed, inject, input } from '@angular/core';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { XpSystemsService } from '../../services/xp-systems.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'm-level-indicator',
  imports: [TooltipDirective, CommonModule, NgStyle, NgClass],
  templateUrl: './level-indicator.component.html'
})
export class LevelIndicatorComponent {
  private readonly xpService = inject(XpSystemsService);

  protected readonly levelColors = [
    { max: 50, color: '#5d5d5d' },
    { max: 100, color: '#e84855' },
    { max: 150, color: '#ff8645' },
    { max: 200, color: '#ffd000' },
    { max: 250, color: '#47c27c' },
    { max: 300, color: '#3f4aca' },
    { max: 350, color: '#873de1' },
    { max: 400, color: '#d34a8d' },
    { max: 450, color: '#3185fc' },
    { max: 500, color: '#161616' },
    { max: Infinity, color: '#ffffff' }
  ];

  readonly totalLevel = input<number>();

  protected readonly level = computed(() =>
    this.xpService.getInnerLevel(this.totalLevel())
  );
  protected readonly prestige = computed(() =>
    this.xpService.getPrestige(this.totalLevel())
  );
  protected readonly prestigeIcon = computed(() =>
    this.getPrestigeIcon(this.prestige())
  );
  protected readonly levelColor = computed(
    () => this.levelColors.find(({ max }) => this.level() < max).color
  );
  protected readonly textColor = computed(() =>
    this.levelColor() === '#ffffff' ? 'text-black' : 'text-white'
  );
  protected readonly imageClass = computed(() =>
    this.levelColor() === '#ffffff' ? 'invert-0' : 'invert'
  );

  private getPrestigeIcon(prestige: number): string {
    return prestige <= 5
      ? `assets/images/prestige/prestige${prestige}.svg`
      : 'assets/images/prestige/max_level.svg';
  }
}

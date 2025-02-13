import { Component, Input, OnChanges } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { XpSystemsService } from '../../services/xp-systems.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'm-level-indicator',
  imports: [TooltipDirective, NgStyle, NgClass],
  templateUrl: './level-indicator.component.html'
})
export class LevelIndicatorComponent implements OnChanges {
  protected level: number;
  protected levelColor: string;
  protected prestige: number;
  protected prestigeIcon: string;
  protected textColor: string;
  protected imageClass: string;
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

  @Input()
  totalLevel: number;

  constructor(private readonly xpService: XpSystemsService) {}

  ngOnChanges() {
    this.level = this.xpService.getInnerLevel(this.totalLevel);
    this.prestige = this.xpService.getPrestige(this.totalLevel);
    this.prestigeIcon = this.getPrestigeIcon(this.prestige);

    this.levelColor = this.levelColors.find(
      ({ max }) => this.level < max
    ).color;

    this.textColor =
      this.levelColor === '#ffffff' ? 'text-black' : 'text-white';
    this.imageClass = this.levelColor === '#ffffff' ? 'invert-0' : 'invert';
  }

  private getPrestigeIcon(prestige: number): string {
    return prestige <= 5
      ? `assets/images/prestige/prestige${prestige}.svg`
      : 'assets/images/prestige/max_level.svg';
  }
}

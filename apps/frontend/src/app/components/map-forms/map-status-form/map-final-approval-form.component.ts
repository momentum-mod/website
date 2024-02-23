import { Component, forwardRef, Input } from '@angular/core';
import {
  GamemodeName,
  LeaderboardType,
  MapSubmissionApproval,
  TrackType,
  TrackTypeName
} from '@momentum/constants';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { DatePipe, JsonPipe, KeyValuePipe, NgClass } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { leaderboardKey } from '@momentum/util-fn';
import * as Chart from 'chart.js';
import { DropdownModule } from 'primeng/dropdown';
import { IconComponent } from '../../../icons';
import { PluralPipe, TimingPipe, UnsortedKeyvaluePipe } from '../../../pipes';
import { AccordionComponent } from '../../accordion/accordion.component';
import { AccordionItemComponent } from '../../accordion/accordion-item.component';
import { SliderComponent } from '../../slider/slider.component';
import { TooltipDirective } from '../../../directives';
import { GroupedLeaderboards } from './map-status-form.component';

@Component({
  selector: 'm-map-final-approval-form',
  templateUrl: 'map-final-approval-form.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    DropdownModule,
    JsonPipe,
    TimingPipe,
    DatePipe,
    ChartModule,
    UnsortedKeyvaluePipe,
    AccordionComponent,
    AccordionItemComponent,
    SliderComponent,
    TooltipDirective,
    PluralPipe,
    KeyValuePipe,
    FormsModule,
    NgClass
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapFinalApprovalFormComponent),
      multi: true
    }
  ]
})
export class MapFinalApprovalFormComponent implements ControlValueAccessor {
  protected readonly TrackType = TrackType;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly LeaderboardTypeDropdown = [
    { type: LeaderboardType.RANKED, label: 'Ranked' },
    { type: LeaderboardType.UNRANKED, label: 'Unranked' },
    { type: LeaderboardType.HIDDEN, label: 'Hidden' }
  ];
  protected readonly TTName = TrackTypeName;
  protected readonly GamemodeName = GamemodeName;
  protected readonly TierChartOptions: Chart.ChartOptions;
  protected readonly RatingChartOptions: Chart.ChartOptions;

  public get value(): MapSubmissionApproval[] {
    return [...this.groupedLeaderboards.values()].flatMap(({ leaderboards }) =>
      leaderboards
        .filter(({ trackType }) => trackType !== TrackType.STAGE)
        .map(({ gamemode, trackType, trackNum, tier, type }) => ({
          gamemode,
          trackType,
          trackNum,
          tier,
          type
        }))
    );
  }

  protected disabled = false;

  @Input({ required: true }) groupedLeaderboards: GroupedLeaderboards;

  constructor() {
    this.TierChartOptions = this.chartOptions('Reviewer Tiers');
    this.RatingChartOptions = this.chartOptions('Reviewer Gameplay Ratings');
  }

  protected groupLbSortFn = (a, b): number =>
    b.value.totalRuns - a.value.totalRuns;

  protected leaderboardKey = leaderboardKey;

  writeValue(): void {
    // Doesn't have an actual value as value, just a getter.
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onChange: (value: MapSubmissionApproval[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private chartOptions: (title: string) => Chart.ChartOptions<'bar'> = (
    title
  ) => ({
    bar: { datasets: { barPercentage: 1 } },
    color: '#fff',
    font: { family: 'Roboto, sans-serif', size: 12 },
    scales: {
      x: {
        border: { color: 'rgb(255 255 255 / 0.1)', z: 10 },
        ticks: {
          font: { family: 'Roboto, sans-serif', size: 12 },
          color: '#eee'
        },
        grid: { display: true, color: 'rgb(255 255 255 / 0.05)' }
      },
      y: {
        border: { color: 'rgb(255 255 255 / 0.1)', z: 10 },
        ticks: {
          font: { family: 'Roboto, sans-serif', size: 12 },
          color: '#eee'
        },
        grid: { display: true, color: 'rgb(255 255 255 / 0.05)' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      title: {
        display: true,
        color: '#eee',
        font: { family: 'Roboto, sans-serif', size: 14 },
        text: title
      }
    }
  });
}

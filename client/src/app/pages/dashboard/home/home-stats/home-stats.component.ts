import { Component, Input, OnInit } from '@angular/core';
import { UserStats } from '../../../../@core/models/user-stats.model';

@Component({
  selector: 'home-stats',
  templateUrl: './home-stats.component.html',
  styleUrls: ['./home-stats.component.scss']
})
export class HomeStatsComponent implements OnInit {
  @Input('userStats') userStats: UserStats;

  constructor() {}

  ngOnInit() {}
}

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'map-leaderboard',
  templateUrl: './map-leaderboard.component.html',
  styleUrls: ['./map-leaderboard.component.scss'],
})
export class MapLeaderboardComponent implements OnInit {

  filterActive: boolean;
  constructor() {
    this.filterActive = false;
  }

  ngOnInit() {
  }

}

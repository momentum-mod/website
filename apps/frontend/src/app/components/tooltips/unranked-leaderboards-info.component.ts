import { Component } from '@angular/core';

@Component({
  selector: 'm-unranked-leaderboards-info',
  template: `
    <div class="prose p-3">
      <p class="text-lg font-medium">Unranked Leaderboard</p>
      <p>Unranked leaderboards don't grant ranked points.</p>
      <p>
        Players can compete for top times on this leaderboard specifically, but
        runs don't contribute towards your overall gamemode ranking.
      </p>
    </div>
  `
})
export class UnrankedLeaderboardsInfoComponent {}

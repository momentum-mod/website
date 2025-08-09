import { Component, Input } from '@angular/core';

@Component({
  selector: 'm-hidden-leaderboards-info',
  template: `
    <div class="prose p-3">
      <p class="text-lg font-medium">{{ title }}</p>
      <p>
        Hidden leaderboards are leaderboards for gamemodes that the map is not
        supposed to be played on.
      </p>
      <p>
        In many cases the track will not even be possible to complete, but in
        some cases players may find it fun to compete on them.
      </p>
      <p>
        Like unranked leaderboards, these don't grant ranked points. They also
        don't show up in the in-game map selector, and to play them you need to
        launch the map with your gamemode overriden!
      </p>
    </div>
  `
})
export class HiddenLeaderboardsInfoComponent {
  @Input() title = 'Hidden Leaderboard';
}

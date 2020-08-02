import { Component } from '@angular/core';
import { GameModeDetails } from '../../../@core/models/gamemode-details.model';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'ngx-gamemodes',
  templateUrl: './gamemodes.component.html',
  styleUrls: ['./gamemodes.component.scss'],
})
export class GamemodesComponent {

  gameModes: GameModeDetails[] = [
    {
      url: '/assets/images/surf_loop.webm',
      modeTitle: 'Surf',
      modeDescription: 'Based off of the movement from Counter-Strike: Source, ' +
        'players \"surf\" by gliding along triangular prisms called ramps in order ' +
        'to complete maps.',
      imageUrl: '/assets/images/gamemode_surf.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_skillsurf.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '/assets/images/bhop_loop.webm',
      modeTitle: 'Bunny Hop',
      modeDescription: 'Based off of the movement from Counter-Strike: Source, ' +
        'players repeatedly jump while strafing through the air to continuously ' +
        'gain speed to complete maps.',
      imageUrl: '/assets/images/gamemode_bhop.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_bhop.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '',
      modeTitle: 'Rocket Jump',
      modeDescription: 'Based off of the Soldier class from Team Fortress 2, ' +
        'players shoot unidirectional, fixed-speed rockets and take advantage of the explosion ' +
        'they create to propel themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_rj.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_rocketjump.png',
      isImplemented: true,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/TCDV5aZNYEY'),
    },
    {
      url: '',
      modeTitle: 'Sticky Jump',
      modeDescription: 'Based off of the Demoman class from Team Fortress 2, ' +
        'players shoot explosives that stick to surfaces and have control over ' +
        'their detonation which propels themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_stickyjump.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_stickyjump.png',
      isImplemented: true,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/ubH5tw0ZLBc'),
    },
    {
      url: '/assets/images/ahop_loop.webm',
      modeTitle: 'Accelerated Hop',
      modeDescription: 'Based off of the movement found in Half-Life 2, ' +
        'Accelerated Hop comes from Valve\'s attempt to remove bunnyhopping in an older version of the game. ' +
        'By either hopping completely backwards or holding/pressing the back movement key while hopping, ' +
        'players can gain extreme amounts of velocity.',
      imageUrl: '/assets/images/gamemode_ahop.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_ahop.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '',
      modeTitle: 'Parkour',
      modeDescription: 'Based off of the movement from Titanfall 2, ' +
        'Parkour sees players wall-running, slide hopping, and preserving momentum ' +
        'throughout maps.',
      imageUrl: '/assets/images/gamemode_pk.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_parkour.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/k9jAlYmNK5A'),
    },
    {
      url: '',
      modeTitle: 'Conc',
      modeDescription: 'A classic game mode from the classic Team Fortress, concussion grenade boosting involves ' +
        'priming a concussion grenade to explode at just the right time to propel the player throughout the map.',
      imageUrl: '/assets/images/gamemode_conc.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_conc.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/XYNRNrC5o5Q'),
    },
    {
      url: '',
      modeTitle: 'Climb (KZ/XC)',
      modeDescription: 'Players climb through various obstacles with well-timed jumps and strafes, ' +
        'progressing through maps to reach the end.',
      imageUrl: '/assets/images/gamemode_kz.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_climb.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/J6kYb_O-XFk'),
    },
    {
      url: '',
      modeTitle: 'Tricksurf',
      modeDescription: 'A spinoff mode formed from the Surf game mode, ' +
      'players can create and complete sequences of locations to surf to, ' +
      'known as tricks, for points and bragging rights.',
      imageUrl: '/assets/images/gamemode_tricksurf.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_tricksurf.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/Bcl27Y8pk4A'),
    },
  ];

  currentGameMode?: GameModeDetails;

  gameModeIndex: number;

  constructor(private sanitizer: DomSanitizer) {
    this.currentGameMode = this.gameModes[0];
    this.gameModeIndex = 0;
  }

  setCurrentGamemode(index: number) {
    if (index < this.gameModes.length && index >= 0) {
      this.currentGameMode = this.gameModes[index];
      this.gameModeIndex = index;
    }
  }
}

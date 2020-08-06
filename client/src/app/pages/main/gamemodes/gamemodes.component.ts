import {Component} from '@angular/core';
import {GameModeDetails} from '../../../@core/models/gamemode-details.model';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'ngx-gamemodes',
  templateUrl: './gamemodes.component.html',
  styleUrls: ['./gamemodes.component.scss'],
})
export class GamemodesComponent {

  timer: NodeJS.Timeout;
  delay: NodeJS.Timeout;

  gameModes: GameModeDetails[] = [
    {
      url: '/assets/images/surf_loop.webm',
      modeTitle: 'Surf',
      modeDescription: 'Based on the movement from Counter-Strike: Source, ' +
        'players \"surf\" by gliding along triangular prisms called ramps in order ' +
        'to complete maps.',
      imageUrl: '/assets/images/gamemode_surf.webp',
      iconUrl: '/assets/images/gamemode_icons/site_skillsurf.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '/assets/images/bhop_loop.webm',
      modeTitle: 'Bunny Hop',
      modeDescription: 'Based on the movement from Counter-Strike: Source, ' +
        'players repeatedly jump while strafing through the air to continuously ' +
        'gain speed to complete maps.',
      imageUrl: '/assets/images/gamemode_bhop.webp',
      iconUrl: '/assets/images/gamemode_icons/site_bhop.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '/assets/images/rj_loop.webm',
      modeTitle: 'Rocket Jump',
      modeDescription: 'Based on the Soldier class from Team Fortress 2, ' +
        'players shoot unidirectional, fixed-speed rockets and take advantage of the explosion ' +
        'they create to propel themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_rj.webp',
      iconUrl: '/assets/images/gamemode_icons/site_rocketjump.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '/assets/images/sj_loop.webm',
      modeTitle: 'Sticky Jump',
      modeDescription: 'Based on the Demoman class from Team Fortress 2, ' +
        'players shoot explosives that stick to surfaces and have control over ' +
        'their detonation which propels themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_sj.webp',
      iconUrl: '/assets/images/gamemode_icons/site_stickyjump.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '/assets/images/ahop_loop.webm',
      modeTitle: 'Accelerated Hop',
      modeDescription: 'Based on the movement found in Half-Life 2, ' +
        'Accelerated Hop comes from Valve\'s attempt to remove bunnyhopping in an older version of the game. ' +
        'By either hopping completely backwards or holding/pressing the back movement key while hopping, ' +
        'players can gain extreme amounts of velocity.',
      imageUrl: '/assets/images/gamemode_ahop.webp',
      iconUrl: '/assets/images/gamemode_icons/site_ahop.png',
      isImplemented: true,
      useYoutubeEmbed: false,
      safeYoutubeUrl: null,
    },
    {
      url: '',
      modeTitle: 'Parkour',
      modeDescription: 'Based on the movement from Titanfall 2, ' +
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
      iconUrl: '/assets/images/gamemode_icons/site_conc.webp',
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
      'known as tricks, for XP and bragging rights.',
      imageUrl: '/assets/images/gamemode_tricksurf.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_tricksurf.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      safeYoutubeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/Bcl27Y8pk4A'),
    },
  ];

  currentGameMode?: GameModeDetails;

  gameModeIndex: number;
  gameModeSectionVisible: boolean;
  static readonly GAMEMODE_CHANGE_TIME = 25;
  static readonly GAMEMODE_CHANGE_TIME_MANUAL = 60;

  constructor(private sanitizer: DomSanitizer) {
    this.currentGameMode = this.gameModes[0];
    this.gameModeIndex = 0;
    this.gameModeSectionVisible = false;
  }

  incrementGamemodeIndex() {
    if (this.gameModeIndex < this.gameModes.length - 1) {
      this.gameModeIndex++;
    } else {
      this.gameModeIndex = 0;
    }
    this.currentGameMode = this.gameModes[this.gameModeIndex];
    this.onTimesUp();
    this.startTimer(GamemodesComponent.GAMEMODE_CHANGE_TIME);
  }

  setCurrentGamemode(index: number) {
    if (index < this.gameModes.length && index >= 0) {
      // reset gallery timeout for changing index
      clearInterval(this.timer);
      clearTimeout(this.delay);
      this.delay = setTimeout(() => {
          this.incrementGamemodeIndex();
          this.timer = this.getGameModeChangeInterval();
        }, GamemodesComponent.GAMEMODE_CHANGE_TIME_MANUAL * 1000);

      this.currentGameMode = this.gameModes[index];
      this.gameModeIndex = index;
      this.onTimesUp();
      this.startTimer(GamemodesComponent.GAMEMODE_CHANGE_TIME_MANUAL);
    }
  }

  onGameModeSectionVisible() {
    this.gameModeSectionVisible = true;
    this.startTimer(GamemodesComponent.GAMEMODE_CHANGE_TIME);
    this.timer = this.getGameModeChangeInterval();
  }

  getGameModeChangeInterval(): NodeJS.Timeout {
    return setInterval(() => {
      this.incrementGamemodeIndex();
    }, GamemodesComponent.GAMEMODE_CHANGE_TIME * 1000);
  }

  // Credit: Mateusz Rybczonec

  // Length = 2πr = 2 * π * 45 = 282.6
  readonly FULL_DASH_ARRAY = 283;

  timePassed: number = 0;
  timeLeft: number = GamemodesComponent.GAMEMODE_CHANGE_TIME;
  circleTimerInterval: NodeJS.Timeout = null;

  onTimesUp() {
    clearInterval(this.circleTimerInterval);
    this.timeLeft = 0;
    this.timePassed = 0;
  }

  startTimer(timeLimit: number) {
    this.timeLeft = timeLimit;
    this.circleTimerInterval = setInterval(() => {
      this.timePassed = this.timePassed += 1;
      this.timeLeft = timeLimit - this.timePassed;
      this.setCircleDasharray(timeLimit);

      if (this.timeLeft === 0) {
        this.onTimesUp();
      }
    }, 1000);
  }

  calculateTimeFraction(timeLimit: number) {
    const rawTimeFraction = this.timeLeft / timeLimit;
    return rawTimeFraction - (1 / timeLimit) * (1 - rawTimeFraction);
  }

  setCircleDasharray(timeLimit: number) {
    const circleDasharray = `${(
      this.calculateTimeFraction(timeLimit) * this.FULL_DASH_ARRAY
    ).toFixed(0)} 283`;
    document.getElementById('base-timer-path-remaining')
      .setAttribute('stroke-dasharray', circleDasharray);
  }
}

import { Component, OnDestroy } from '@angular/core';
import { GameModeDetails } from '../../../@core/models/gamemode-details.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'ngx-gamemodes',
  templateUrl: './gamemodes.component.html',
  styleUrls: ['./gamemodes.component.scss']
})
export class GamemodesComponent implements OnDestroy {
  timer: number;
  delay: number;

  gameModes: GameModeDetails[] = [
    {
      url: '/assets/images/surf_loop.webm',
      modeTitle: 'Surf',
      modeDescription:
        'Based on the movement from Counter-Strike: Source, ' +
        'players "surf" by gliding along triangular prisms called ramps in order ' +
        'to complete maps.',
      imageUrl: '/assets/images/gamemode_surf.webp',
      iconUrl: '/assets/images/gamemode_icons/site_skillsurf.png',
      isImplemented: true,
      useYoutubeEmbed: false
    },
    {
      url: '/assets/images/bhop_loop.webm',
      modeTitle: 'Bunny Hop',
      modeDescription:
        'Based on the movement from Counter-Strike: Source, ' +
        'players repeatedly jump while strafing through the air to continuously ' +
        'gain speed to complete maps.',
      imageUrl: '/assets/images/gamemode_bhop.webp',
      iconUrl: '/assets/images/gamemode_icons/site_bhop.png',
      isImplemented: true,
      useYoutubeEmbed: false
    },
    {
      url: '/assets/images/rj_loop.webm',
      modeTitle: 'Rocket Jump',
      modeDescription:
        'Based on the Soldier class from Team Fortress 2, ' +
        'players shoot unidirectional, fixed-speed rockets and take advantage of the explosion ' +
        'they create to propel themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_rj.webp',
      iconUrl: '/assets/images/gamemode_icons/site_rocketjump.png',
      isImplemented: true,
      useYoutubeEmbed: false
    },
    {
      url: '/assets/images/sj_loop.webm',
      modeTitle: 'Sticky Jump',
      modeDescription:
        'Based on the Demoman class from Team Fortress 2, ' +
        'players shoot explosives that stick to surfaces and have control over ' +
        'their detonation which propels themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_sj.webp',
      iconUrl: '/assets/images/gamemode_icons/site_stickyjump.png',
      isImplemented: true,
      useYoutubeEmbed: false
    },
    {
      url: '/assets/images/ahop_loop.webm',
      modeTitle: 'Accelerated Hop',
      modeDescription:
        'Based on the movement found in Half-Life 2, ' +
        "Accelerated Hop comes from Valve's attempt to remove bunnyhopping in an older version of the game. " +
        'By either hopping completely backwards or holding/pressing the back movement key while hopping, ' +
        'players can gain extreme amounts of velocity.',
      imageUrl: '/assets/images/gamemode_ahop.webp',
      iconUrl: '/assets/images/gamemode_icons/site_ahop.png',
      isImplemented: true,
      useYoutubeEmbed: false
    },
    {
      url: '',
      modeTitle: 'Parkour',
      modeDescription:
        'Based on the movement from Titanfall 2, ' +
        'Parkour sees players wall-running, slide hopping, and preserving momentum ' +
        'throughout maps.',
      imageUrl: '/assets/images/gamemode_pk.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_parkour.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      playingYoutubeEmbed: false,
      youtubeVidID: 'k9jAlYmNK5A'
    },
    {
      url: '',
      modeTitle: 'Conc',
      modeDescription:
        'A classic game mode from the classic Team Fortress, concussion grenade boosting involves ' +
        'priming a concussion grenade to explode at just the right time to propel the player throughout the map.',
      imageUrl: '/assets/images/gamemode_conc.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_conc.webp',
      isImplemented: false,
      useYoutubeEmbed: true,
      playingYoutubeEmbed: false,
      youtubeVidID: 'XYNRNrC5o5Q'
    },
    {
      url: '',
      modeTitle: 'Climb (KZ/XC)',
      modeDescription:
        'Players climb through various obstacles with well-timed jumps and strafes, ' +
        'progressing through maps to reach the end.',
      imageUrl: '/assets/images/gamemode_kz.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_climb.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      playingYoutubeEmbed: false,
      youtubeVidID: 'J6kYb_O-XFk'
    },
    {
      url: '',
      modeTitle: 'Tricksurf',
      modeDescription:
        'A spinoff mode formed from the Surf game mode, ' +
        'players can create and complete sequences of locations to surf to, ' +
        'known as tricks, for XP and bragging rights.',
      imageUrl: '/assets/images/gamemode_tricksurf.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_tricksurf.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      playingYoutubeEmbed: false,
      youtubeVidID: 'Bcl27Y8pk4A'
    },
    {
      url: '',
      modeTitle: 'Defrag',
      modeDescription:
        'Based on the original mode from Quake, ' +
        'players perform forward-focused hops and strafes, aided in part by some weapons, in order to complete maps.',
      imageUrl: '/assets/images/gamemode_defrag.jpg',
      iconUrl: '/assets/images/gamemode_icons/site_defrag.png',
      isImplemented: false,
      useYoutubeEmbed: true,
      playingYoutubeEmbed: false,
      youtubeVidID: 'GAq39tM09Yg'
    }
  ];

  currentGameMode?: GameModeDetails;

  gameModeIndex: number;
  gameModeSectionVisible: boolean;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  static readonly GAMEMODE_CHANGE_TIME = 25;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  static readonly GAMEMODE_CHANGE_TIME_MANUAL = 60;

  constructor(private sanitizer: DomSanitizer) {
    this.currentGameMode = this.gameModes[0];
    this.gameModeIndex = 0;
    this.gameModeSectionVisible = false;
  }

  ngOnDestroy() {
    clearInterval(this.circleTimerInterval);
    clearInterval(this.delay);
    clearInterval(this.timer);
  }

  incrementGamemodeIndex() {
    if (this.gameModeIndex < this.gameModes.length - 1) {
      this.gameModeIndex++;
    } else {
      this.gameModeIndex = 0;
    }
    this.currentGameMode.playingYoutubeEmbed = false;
    this.currentGameMode = this.gameModes[this.gameModeIndex];
    this.currentGameMode.youtubeVidURL = this.getGameModeYouTubeVideo();
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

      this.currentGameMode.playingYoutubeEmbed = false;
      this.currentGameMode = this.gameModes[index];
      this.currentGameMode.youtubeVidURL = this.getGameModeYouTubeVideo();
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

  getGameModeChangeInterval(): number {
    return setInterval(() => {
      this.incrementGamemodeIndex();
    }, GamemodesComponent.GAMEMODE_CHANGE_TIME * 1000);
  }

  getGameModeYouTubeVideo(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${this.currentGameMode.youtubeVidID}?autoplay=1`
    );
  }

  getGameModeYouTubePoster(): string {
    return `https://i.ytimg.com/vi/${this.currentGameMode.youtubeVidID}/sddefault.jpg`;
  }

  // Credit: Mateusz Rybczonec

  // Length = 2πr = 2 * π * 45 = 282.6
  // eslint-disable-next-line @typescript-eslint/member-ordering
  static readonly FULL_DASH_ARRAY = 283;

  // eslint-disable-next-line @typescript-eslint/member-ordering
  timePassed = 0;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  timeLeft: number = GamemodesComponent.GAMEMODE_CHANGE_TIME;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  circleTimerInterval: number = null;

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
      this.calculateTimeFraction(timeLimit) * GamemodesComponent.FULL_DASH_ARRAY
    ).toFixed(0)} 283`;
    document
      .querySelector('#base-timer-path-remaining')
      .setAttribute('stroke-dasharray', circleDasharray);
  }
}

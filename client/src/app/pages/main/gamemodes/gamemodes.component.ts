import { Component, OnInit, OnDestroy } from '@angular/core';
import { Gallery, GalleryItem, GalleryState } from '@ngx-gallery/core';
import { map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { GameModeDetails } from '../../../@core/models/gamemode-details.model';

@Component({
  selector: 'ngx-gamemodes',
  templateUrl: './gamemodes.component.html',
  styleUrls: ['./gamemodes.component.scss'],
})
export class GamemodesComponent implements OnInit, OnDestroy {

  private ngUnsub = new Subject();

  currentGamemodesItems: GalleryItem[];
  futureGamemodesItems: GalleryItem[];

  currentGameModes: GameModeDetails[] = [
    {
      url: 'https://www.youtube.com/watch?v=Awld0PXTfs0',
      modeTitle: 'Surf',
      modeDescription: 'Based off of the movement from Counter-Strike: Source, ' +
        'players \"surf\" by gliding along triangular prisms called ramps in order ' +
        'to complete maps.',
      imageUrl: '/assets/images/gamemode_surf.jpg',
    },
    {
      url: 'https://www.youtube.com/watch?v=8IvXWjjqHiA',
      modeTitle: 'Bunnyhop',
      modeDescription: 'Based off of the movement from Counter-Strike: Source, ' +
        'players repeatedly jump while strafing through the air to continuously ' +
        'gain speed to complete maps.',
      imageUrl: '/assets/images/gamemode_bhop.jpg',
    },
    {
      url: 'https://www.youtube.com/watch?v=sMkT7GjCvQA',
      modeTitle: 'Rocket Jump',
      modeDescription: 'Based off of the Soldier class from Team Fortress 2, ' +
        'players shoot unidirectional, fixed-speed rockets and take advantage of the explosion ' +
        'they create to propel themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_rj.jpg',
    },
    {
      url: 'https://youtu.be/sKHlRQJkviI',
      modeTitle: 'Sticky Jump',
      modeDescription: 'Based off of the Demoman class from Team Fortress 2, ' +
        'players shoot explosives that stick to surfaces and have control over ' +
        'their detonation which propels themselves throughout maps.',
      imageUrl: '/assets/images/gamemode_stickyjump.jpg',
    },
  ];
  // Future Gamemodes Data
  futureGameModes: GameModeDetails[] = [
    {
      url: 'https://www.youtube.com/watch?v=8M_GbJSU1Rw',
      modeTitle: 'Accelerated Hop',
      modeDescription: 'Based off of the movement found in Half-Life 2, ' +
        'Accelerated Hop comes from Valve\'s attempt to remove bunnyhopping in an older version of the game. ' +
        'By either hopping completely backwards or holding/pressing the back movement key while hopping, ' +
        'players can gain extreme amounts of velocity.',
      imageUrl: '/assets/images/gamemode_ahop.jpg',
    },
    {
      url: 'https://www.youtube.com/watch?v=J6kYb_O-XFk',
      modeTitle: 'KZ (Climb)',
      modeDescription: 'Players ascend various maps in a parkour-like fashion, ' +
        'climbing through environments to reach the end.',
      imageUrl: '/assets/images/gamemode_kz.jpg',
    },
    {
      url: 'https://www.youtube.com/watch?v=Bcl27Y8pk4A',
      modeTitle: 'Tricksurf',
      modeDescription: 'A spinoff mode formed from the Surf gamemode, ' +
      'players can create and complete sequences of locations to surf to, ' +
      'known as tricks, for points and bragging rights.',
      imageUrl: '/assets/images/gamemode_tricksurf.jpg',
    },
  ];

  currentGameMode?: GameModeDetails;
  futureGameMode?: GameModeDetails;

  constructor(public gallery: Gallery) { }

  ngOnInit() {
    // Map images for gallery
    this.currentGamemodesItems = this.currentGameModes.map(
        item => new CustomGalleryItem({ src: item.imageUrl, thumb: item.imageUrl, youtubeLink: item.url }),
      );
    this.futureGamemodesItems = this.futureGameModes.map(
        item => new CustomGalleryItem({ src: item.imageUrl, thumb: item.imageUrl, youtubeLink: item.url }),
      );

    // Get gallery references
    const currentGalleryRef = this.gallery.ref('current-gamemodes');
    const futureGalleryRef = this.gallery.ref('future-gamemodes');

    // Init galleries
    this.currentGameMode = this.currentGameModes[0];
    this.futureGameMode = this.futureGameModes[0];

    // Subscribe to gallery index changed event
    currentGalleryRef.indexChanged.pipe(takeUntil(this.ngUnsub)).subscribe((galleryState: GalleryState) => {
        this.currentGameMode = this.currentGameModes[galleryState.currIndex];
    });
    futureGalleryRef.indexChanged.pipe(takeUntil(this.ngUnsub)).subscribe((galleryState: GalleryState) => {
      this.futureGameMode = this.futureGameModes[galleryState.currIndex];
    });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }
}

export class CustomGalleryItem implements GalleryItem {

  readonly type = 'custom-item';
  readonly data: any;

  constructor(data: any) {
    this.data = data;
  }
}

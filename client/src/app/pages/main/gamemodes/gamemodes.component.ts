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
export class GamemodesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

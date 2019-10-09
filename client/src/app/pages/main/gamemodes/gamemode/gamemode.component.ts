import {Component, Input} from '@angular/core';

@Component({
  selector: 'gamemode',
  templateUrl: './gamemode.component.html',
  styleUrls: ['./gamemode.component.scss'],
})
export class GamemodeComponent {

  @Input('modeString') modeString: string;
  @Input('modeImageURL') modeImageURL: string;
  @Input('modeVideoURL') modeVideoURL: string;

  constructor() { }
}

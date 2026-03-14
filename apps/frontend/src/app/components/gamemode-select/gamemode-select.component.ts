import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Gamemode } from '@momentum/constants';
import { CommonModule, NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'm-gamemode-select',
  templateUrl: './gamemode-select.component.html',
  imports: [CommonModule, NgClass, NgStyle]
})
export class GamemodeSelectComponent {
  @Input() value: Gamemode | null = null;
  @Output() valueChange = new EventEmitter<Gamemode | null>();

  /** Whether to show the "All modes" null option. */
  @Input() allowNull = true;

  protected readonly Gamemode = Gamemode;

  protected select(mode: Gamemode | null): void {
    this.valueChange.emit(mode);
  }
}

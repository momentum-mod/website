import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Gamemode } from '@momentum/constants';

/**
 * The big display-font gamemode picker used by the map browser, rankings and
 * profile pages. `null` means "all modes" and is only offered when
 * `allowNull` is set.
 */
@Component({
  selector: 'm-gamemode-select',
  templateUrl: './gamemode-select.component.html',
  imports: [NgClass, NgTemplateOutlet]
})
export class GamemodeSelectComponent {
  protected readonly Gamemode = Gamemode;

  @Input() value: Gamemode | null = null;
  @Output() readonly valueChange = new EventEmitter<Gamemode | null>();

  /** Whether to offer the "All modes" (null) option. */
  @Input() allowNull = true;

  protected select(mode: Gamemode | null): void {
    if (mode === this.value) return;
    this.value = mode;
    this.valueChange.emit(mode);
  }
}

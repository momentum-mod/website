import { Component, input, model } from '@angular/core';
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

  readonly value = model<Gamemode | null>(null);

  /** Whether to offer the "All modes" (null) option. */
  readonly allowNull = input(true);

  protected select(mode: Gamemode | null): void {
    if (mode === this.value()) return;
    this.value.set(mode);
  }
}

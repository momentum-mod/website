import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Popover } from 'primeng/popover';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';

export type Chip = number | string;

@Component({
  selector: 'm-chips',
  standalone: true,
  imports: [CommonModule, IconComponent, TooltipDirective, Popover],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipsComponent),
      multi: true
    }
  ],
  templateUrl: './chips.component.html'
})
export class ChipsComponent implements ControlValueAccessor {
  // The chips picked by the user
  selected: Chip[] | null = [];

  // Available chips
  private _chips: Chip[] = [];
  get chips() {
    return this._chips;
  }
  @Input({ required: true }) set chips(chips: Chip[]) {
    this._chips = chips;

    this.selected =
      this.selected?.filter((selected) => chips.includes(selected)) ?? [];
  }

  get available() {
    return this.chips.filter((chip) => !this.selected?.includes(chip));
  }

  @Input() typeName = 'Chip';

  /**
   * If chip type is numeric (e.g. enum vals), you can provide a function that
   * maps values to strings. Otherwise just provide plain strings!
   */
  @Input() nameFn?: (chip: number) => string;

  /**
   * Function to provide image urls for chips.
   */
  @Input() imageFn?: (chip: Chip) => string | null;

  protected disabled = false;

  add(chip: Chip) {
    if (this.disabled || this.selected?.includes(chip)) return;

    this.selected.push(chip);
    this.onChange(this.selected);
  }

  remove(chip: Chip) {
    this.selected.splice(this.selected.indexOf(chip), 1);
    this.onChange(this.selected);
  }

  reset() {
    this.selected = [];
    this.onChange(this.selected);
  }

  getChipName(chip: number | string): string {
    if (typeof chip == 'number') {
      if (this.nameFn) {
        return this.nameFn(chip);
      } else {
        return chip.toString();
      }
    }

    return chip;
  }

  getChipImage(chip: Chip): string | null {
    if (this.imageFn) return this.imageFn(chip);
    return null;
  }

  onChange: (value: Chip[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(setDisabled: boolean): void {
    this.disabled = setDisabled;
  }

  writeValue(value: Chip[] | null) {
    this.selected = value ?? [];
  }
}

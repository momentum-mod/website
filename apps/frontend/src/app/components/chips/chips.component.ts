import { Component, Input, TemplateRef, forwardRef } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Popover } from 'primeng/popover';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';

/**
 * For objects, includeFn and nameFn must be provided.
 * For numbers, only nameFn is needed.
 * For strings, neither are needed.
 */
export type Chip = unknown;

@Component({
  selector: 'm-chips',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    TooltipDirective,
    Popover,
    NgTemplateOutlet
  ],
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
      this.selected?.filter((selected) => this.includesFn(chips, selected)) ??
      [];
  }

  get available() {
    return this.chips.filter((chip) => !this.includesFn(this.selected, chip));
  }

  @Input() typeName = 'Chip';

  /**
   * You can provide a function that maps values to strings.
   */
  @Input() nameFn?: (chip: Chip) => string;

  /**
   * Function to provide image urls for chips.
   */
  @Input() imageFn?: (chip: Chip) => string | null;

  /**
   * Check that a collection of chips includes the given chip.
   * This defaults to .includes() array method, so needs to be set if chips
   * are of an object type.
   */
  @Input() includesFn = (collection: Chip[], chip: Chip) =>
    collection.includes(chip);

  /**
   * Placed at the end (within) each selected tag.
   */
  @Input() appendEachSelectedTemplate?: TemplateRef<any>;

  protected disabled = false;

  add(chip: Chip) {
    if (this.disabled || this.includesFn(this.selected, chip)) return;

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

  getChipName(chip: Chip): string {
    if (this.nameFn) {
      return this.nameFn(chip);
    } else if (typeof chip === 'number') {
      return chip.toString();
    } else if (typeof chip === 'string') {
      return chip;
    } else {
      return '';
    }
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

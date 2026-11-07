import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
  TemplateRef
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { PopoverComponent } from '../popover/popover.component';

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
    NgTemplateOutlet,
    PopoverComponent
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
  // All chips that can be picked
  readonly chips = input.required<Chip[]>();

  // The chips picked by the user, as last written/changed
  private readonly rawSelected = signal<Chip[]>([]);

  // Selected chips that are still available, e.g. after `chips` changes
  readonly selected = computed(() =>
    this.rawSelected().filter((selected) =>
      this.includesFn()(this.chips(), selected)
    )
  );

  protected readonly available = computed(() =>
    this.chips().filter((chip) => !this.includesFn()(this.selected(), chip))
  );

  /**
   * Show chip name on hover instead of on the chip
   */
  readonly hoverNames = input(false);

  readonly typeName = input('Chip');

  protected readonly anchorName = `--chips-${Math.random().toString(36).substring(2, 12)}`;

  /**
   * You can provide a function that maps values to strings.
   */
  readonly nameFn = input<(chip: Chip) => string>();

  /**
   * Function to provide image urls for chips.
   */
  readonly imageFn = input<(chip: Chip) => string | null>();

  /**
   * Check that a collection of chips includes the given chip.
   * This defaults to .includes() array method, so needs to be set if chips
   * are of an object type.
   */
  readonly includesFn = input((collection: Chip[], chip: Chip) =>
    collection.includes(chip)
  );

  /**
   * Placed at the end (within) each selected tag.
   */
  readonly appendEachSelectedTemplate = input<TemplateRef<any>>();

  protected readonly disabled = signal(false);

  add(chip: Chip) {
    if (this.disabled() || this.includesFn()(this.selected(), chip)) return;

    this.setSelected([...this.selected(), chip]);
  }

  remove(chip: Chip) {
    this.setSelected(this.selected().filter((selected) => selected !== chip));
  }

  reset() {
    this.setSelected([]);
  }

  private setSelected(selected: Chip[]) {
    this.rawSelected.set(selected);
    this.onChange(selected);
  }

  getChipName(chip: Chip): string {
    const nameFn = this.nameFn();
    if (nameFn) {
      return nameFn(chip);
    } else if (typeof chip === 'number') {
      return chip.toString();
    } else if (typeof chip === 'string') {
      return chip;
    } else {
      return '';
    }
  }

  getChipImage(chip: Chip): string | null {
    const imageFn = this.imageFn();
    if (imageFn) return imageFn(chip);
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
    this.disabled.set(setDisabled);
  }

  writeValue(value: Chip[] | null) {
    this.rawSelected.set(value ?? []);
  }
}

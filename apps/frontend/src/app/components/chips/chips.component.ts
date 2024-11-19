import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../icons';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TooltipDirective } from '../../directives/tooltip.directive';

type Chip = string;

@Component({
  selector: 'm-chips',
  standalone: true,
  imports: [CommonModule, IconComponent, OverlayPanelModule, TooltipDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipsComponent),
      multi: true
    }
  ],
  templateUrl: './chips.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChipsComponent implements ControlValueAccessor {
  // The chips picked by the user.
  selected: Chip[] = [];

  // Not bothering updating selected chips if items removed from here.
  // TODO: fuck you, do this
  @Input({ required: true }) chips: Chip[] = [];

  get available() {
    return this.chips.filter((chip) => !this.selected.includes(chip));
  }

  @Input() name = 'Chip';

  protected disabled = false;

  constructor(private readonly cdRef: ChangeDetectorRef) {}

  add(chip: Chip): boolean {
    if (this.disabled || this.selected.includes(chip)) return false;

    this.selected.push(chip);
    this.onChange(this.selected);
    this.cdRef.markForCheck();
    return true;
  }

  remove(chip: Chip) {
    this.selected.splice(this.selected.indexOf(chip), 1);
    this.onChange(this.selected);
    this.cdRef.markForCheck();
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

  writeValue(value: Chip[]) {
    this.selected = value;
    this.cdRef.markForCheck();
  }
}

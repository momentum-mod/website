import { Component, input, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { IconComponent } from '../../icons';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'm-dropdown',
  templateUrl: 'dropdown.component.html',
  imports: [IconComponent, NgStyle],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: DropdownComponent
    }
  ]
})
export class DropdownComponent implements ControlValueAccessor {
  // First element is used as default for dropdown button in template.
  readonly entries = input.required<number[]>();

  // If you're adding support for string entries, use the same strategy as chips component does
  readonly nameFn = input.required<(entry: number) => string>();

  protected readonly selectedEntry = signal<number | null>(null);

  // HTML id needed for popover usage, can't use a class.
  protected readonly id = `dropdown-${Math.random().toString(36).substring(2, 12)}`;

  protected readonly disabled = signal(false);

  select(entry: number): void {
    if (this.disabled()) return;

    this.selectedEntry.set(entry);
    this.onChange(entry);
  }

  setDisabledState(setDisabled: boolean): void {
    this.disabled.set(setDisabled);
  }

  writeValue(entry: number): void {
    this.selectedEntry.set(entry);
  }

  onChange: (entry: number) => void = () => void 0;
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}

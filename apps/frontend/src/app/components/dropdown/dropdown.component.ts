import { Component, ElementRef, Input, ViewChild } from '@angular/core';
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
  @Input({ required: true }) entries: number[] = [];

  @Input() entryNameFn?: (entry: number) => string;

  protected selectedEntry: number;

  // HTML id needed for popover usage, can't use a class.
  protected readonly id = `dropdown-${Math.random().toString(36).substring(2, 12)}`;

  select(entry: number): void {
    this.selectedEntry = entry;
    this.onChange(this.selectedEntry);
  }

  writeValue(entry: number): void {
    this.selectedEntry = entry;
  }

  onChange: (entry: number) => void = () => void 0;
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // Remove everything below when Firefox implements anchor positioning.
  // Also remove call in template, and labels for ViewChild-s.

  @ViewChild('toggle')
  toggleElem: ElementRef<HTMLButtonElement>;

  @ViewChild('dropdown', { static: false })
  dropdownElem: ElementRef<HTMLDivElement>;

  fixUnsupportedAnchorPosition() {
    if (!('anchorName' in document.documentElement.style)) {
      const toggleElemCoords =
        this.toggleElem.nativeElement.getBoundingClientRect();
      // Gets position fixed implicitly by popover when shown.
      this.dropdownElem.nativeElement.style.top =
        toggleElemCoords.bottom.toString() + 'px';
      this.dropdownElem.nativeElement.style.left =
        toggleElemCoords.left.toString() + 'px';
    }
  }
}

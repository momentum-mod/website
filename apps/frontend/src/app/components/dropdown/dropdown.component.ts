import { Component, Input, OnInit } from '@angular/core';
import { NgStyle } from '@angular/common';
import { IconComponent } from '../../icons';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import polyfill from '@oddbird/css-anchor-positioning/fn';

@Component({
  selector: 'm-dropdown',
  templateUrl: 'dropdown.component.html',
  styleUrl: 'dropdown.component.css',
  imports: [IconComponent, NgStyle],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: DropdownComponent
    }
  ]
})
export class DropdownComponent implements ControlValueAccessor, OnInit {
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

  // Remove this polyfill when Firefox implements anchor positioning.
  // NOTE: sometimes it just fucks off with the positioning until you F5.
  // The menu is on the bottom-right instead of by the button, which is not horrible.
  async ngOnInit() {
    if (!('anchorName' in document.documentElement.style)) {
      await polyfill();
    }
  }
}

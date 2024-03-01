import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TooltipDirective } from '../../directives';
import { Icon, IconComponent } from '../../icons';

// Should correspond to .btn-<color> classes.
export type NStateButtonColor =
  | 'blue'
  | 'pale'
  | 'red'
  | 'green'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'yellow';

@Component({
  template: `@if (currentState.text; as text) {
      <p [ngClass]="textClass">{{ text }}</p>
    }
    @if (currentState.icon; as icon) {
      <m-icon [ngClass]="iconClass" [icon]="icon" />
    }`,
  selector: 'm-n-state-button',
  imports: [NgClass, TooltipDirective, IconComponent],
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NStateButtonComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NStateButtonComponent implements ControlValueAccessor {
  @Input({ required: true }) states: Array<{
    color: NStateButtonColor | null;
    text?: string;
    icon?: Icon;
  }>;

  @Input() type: 'button' | 'submit' = 'button';
  @Input() textClass: string;
  @Input() iconClass: string;

  @HostBinding('class') get classes() {
    return `btn btn-${this.currentState?.color ?? ''}`;
  }

  @HostListener('click')
  onClick() {
    this.value = (this.value + 1) % this.states.length;
    this.currentState = this.states[this.value];
    this.onChange(this.value);
    this.cdRef.markForCheck();
  }

  protected value = 0;
  protected currentState: (typeof this.states)[number];
  protected disabled = false;

  constructor(private readonly cdRef: ChangeDetectorRef) {}

  onChange: (value: number) => void = () => void 0;
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

  writeValue(value: number = 0) {
    this.value = value;
    this.currentState = this.states[value];
    this.cdRef.markForCheck();
  }
}

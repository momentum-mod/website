import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon, IconComponent } from '../../icons';
import { NgClass } from '@angular/common';

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

export type NStateButtonStates = Array<{
  color: NStateButtonColor | null;
  text?: string;
  icon?: Icon;
}>;

@Component({
  template: `@if (currentState()?.text; as text) {
      <p [ngClass]="textClass">{{ text }}</p>
    }
    @if (currentState()?.icon; as icon) {
      <m-icon [ngClass]="iconClass" [icon]="icon" />
    }`,
  host: {
    '[style.opacity]': '(disabled() ? "0.5" : "1")'
  },
  selector: 'm-n-state-button',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NStateButtonComponent),
      multi: true
    }
  ],
  imports: [IconComponent, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NStateButtonComponent implements ControlValueAccessor {
  @Input({ required: true }) states: NStateButtonStates;

  @Input() type: 'button' | 'submit' = 'button';
  @Input() textClass: string;
  @Input() iconClass: string;

  @HostBinding('class') get classes() {
    return `btn btn-${this.currentState()?.color ?? ''}`;
  }

  @HostListener('click')
  onClick() {
    if (this.disabled()) return;

    this.value.update((value) => (value + 1) % this.states.length);
    this.currentState.set(this.states[this.value()]);
    this.onChange(this.value());
  }

  protected readonly value = signal(0);
  protected readonly currentState = signal<
    NStateButtonStates[number] | undefined
  >(undefined);

  protected readonly disabled = signal(false);
  @HostBinding('attr.disabled') protected get disabledAttr() {
    return this.disabled();
  }

  onChange: (value: number) => void = () => void 0;
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

  writeValue(value: number = 0) {
    this.value.set(value);
    this.currentState.set(this.states[value]);
  }
}

import { Component, computed, forwardRef, input, signal } from '@angular/core';
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
      <p [ngClass]="textClass()">{{ text }}</p>
    }
    @if (currentState()?.icon; as icon) {
      <m-icon [ngClass]="iconClass()" [icon]="icon" />
    }`,
  host: {
    '[class]': '"btn btn-" + (currentState()?.color ?? "")',
    '[style.opacity]': '(disabled() ? "0.5" : "1")',
    '[attr.disabled]': 'disabled()',
    '(click)': 'onClick()'
  },
  selector: 'm-n-state-button',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NStateButtonComponent),
      multi: true
    }
  ],
  imports: [IconComponent, NgClass]
})
export class NStateButtonComponent implements ControlValueAccessor {
  readonly states = input.required<NStateButtonStates>();

  readonly type = input<'button' | 'submit'>('button');
  readonly textClass = input<string>();
  readonly iconClass = input<string>();

  protected readonly value = signal(0);
  protected readonly currentState = computed(() => this.states()[this.value()]);
  protected readonly disabled = signal(false);

  onClick() {
    if (this.disabled()) return;

    this.value.update((value) => (value + 1) % this.states().length);
    this.onChange(this.value());
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
  }
}

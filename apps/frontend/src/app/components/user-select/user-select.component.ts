import { Component, forwardRef, HostBinding, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { User } from '@momentum/constants';
import { UserComponent } from '../user/user.component';
import { IconComponent } from '../../icons';
import { UserSearchComponent } from '../search/user-search.component';

@Component({
  selector: 'm-user-select',
  imports: [UserComponent, IconComponent, UserSearchComponent],
  templateUrl: './user-select.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UserSelectComponent),
      multi: true
    }
  ],
  styles: '.disabled { pointer-events: none; opacity: 0.5 }'
})
export class UserSelectComponent implements ControlValueAccessor {
  protected readonly value = signal<User | null>(null);

  protected readonly disabled = signal(false);
  @HostBinding('class.disabled') protected get disabledClass() {
    return this.disabled();
  }

  onChange: (value: User | null) => void = () => void 0;
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

  writeValue(value: User | null) {
    this.value.set(value);
  }

  selectUser(user: User) {
    this.value.set(user);
    this.onChange(user);
  }

  removeUser() {
    this.value.set(null);
    this.onChange(null);
  }
}

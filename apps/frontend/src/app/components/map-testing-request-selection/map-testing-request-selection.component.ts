import { Component, forwardRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MAX_TESTING_REQUESTS, User } from '@momentum/constants';
import { NbPopoverDirective } from '@nebular/theme';
import { UserSearchComponent } from '../user-search/user-search.component';
import { showPopoverDuration } from '../../utils/popover-utils';

@Component({
  selector: 'mom-map-testing-request-selection',
  templateUrl: 'map-testing-request-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapTestingRequestSelectionComponent),
      multi: true
    }
  ]
})
export class MapTestingRequestSelectionComponent
  implements ControlValueAccessor
{
  protected readonly MAX_TESTING_REQUESTS = MAX_TESTING_REQUESTS;

  protected users: User[] = [];
  protected readonly max = MAX_TESTING_REQUESTS;
  protected disabled = false;

  @ViewChild(NbPopoverDirective) popover: NbPopoverDirective;

  get value(): number[] {
    return this.users.map(({ id }) => id);
  }

  addUser(user: User, searchInput: UserSearchComponent): void {
    if (this.users.length >= this.max) {
      showPopoverDuration(this.popover, 'Maximum number of users reached!');
    } else if (this.users.some(({ id }) => id === user.id)) {
      showPopoverDuration(this.popover, 'User already added!');
    } else {
      searchInput.resetSearchBox();
      this.users.push(user);
      this.onTouched();
      this.onChange(this.value);
    }
  }

  removeUser(userID: number): void {
    const index = this.users.findIndex(({ id }) => id === userID);
    if (index !== -1) this.users.splice(index, 1);
    this.onTouched();
    this.onChange(this.value);
  }

  writeValue(value: User[] | null): void {
    this.users = value ?? [];
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  onChange: (value: number[]) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

import { Component, forwardRef, signal, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MAX_TEST_INVITES, User } from '@momentum/constants';
import { UserSearchComponent } from '../../search/user-search.component';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { NgClass } from '@angular/common';
import { UserComponent } from '../../user/user.component';

@Component({
  selector: 'm-map-test-invite-selection',
  templateUrl: 'map-test-invite-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapTestInviteSelectionComponent),
      multi: true
    }
  ],
  imports: [UserSearchComponent, NgClass, TooltipDirective, UserComponent]
})
export class MapTestInviteSelectionComponent implements ControlValueAccessor {
  protected readonly MAX_TESTING_REQUESTS = MAX_TEST_INVITES;

  protected readonly users = signal<User[]>([]);
  protected readonly disabled = signal(false);

  @ViewChild(TooltipDirective) tooltip: TooltipDirective;

  get value(): number[] {
    return this.users().map(({ id }) => id);
  }

  addUser(user: User, searchInput: UserSearchComponent): void {
    if (this.users().length >= this.MAX_TESTING_REQUESTS) {
      this.tooltip.setAndShow('Maximum number of users reached!', true);
    } else if (this.users().some(({ id }) => id === user.id)) {
      this.tooltip.setAndShow('User already added!', true);
    } else {
      searchInput.resetSearchBox();
      this.users.update((users) => [...users, user]);
      this.onTouched();
      this.onChange(this.value);
    }
  }

  removeUser(userID: number): void {
    this.users.update((users) => users.filter(({ id }) => id !== userID));
    this.onTouched();
    this.onChange(this.value);
  }

  writeValue(value: User[] | null): void {
    this.users.set(value ?? []);
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
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

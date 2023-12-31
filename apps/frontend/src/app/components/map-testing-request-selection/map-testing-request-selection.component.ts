import { Component, forwardRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MAX_TESTING_REQUESTS, User } from '@momentum/constants';
import { NgClass } from '@angular/common';
import { UserSearchComponent } from '../search/user-search/user-search.component';
import { TooltipDirective } from '../../directives';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'm-map-testing-request-selection',
  templateUrl: 'map-testing-request-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapTestingRequestSelectionComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [NgClass, UserSearchComponent, TooltipDirective, AvatarComponent]
})
export class MapTestingRequestSelectionComponent
  implements ControlValueAccessor
{
  protected readonly MAX_TESTING_REQUESTS = MAX_TESTING_REQUESTS;

  protected users: User[] = [];
  protected readonly max = MAX_TESTING_REQUESTS;
  protected disabled = false;

  @ViewChild(TooltipDirective) tooltip: TooltipDirective;

  get value(): number[] {
    return this.users.map(({ id }) => id);
  }

  addUser(user: User, searchInput: UserSearchComponent): void {
    if (this.users.length >= this.max) {
      this.tooltip.setAndShow('Maximum number of users reached!', true);
    } else if (this.users.some(({ id }) => id === user.id)) {
      this.tooltip.setAndShow('User already added!', true);
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

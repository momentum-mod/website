import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { Component, forwardRef, QueryList, ViewChildren } from '@angular/core';
import {
  MAX_USER_ALIAS_LENGTH,
  MapCreditNames,
  MapCreditType,
  User
} from '@momentum/constants';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDropList,
  CdkDrag
} from '@angular/cdk/drag-drop';
import * as Enum from '@momentum/enum';
import { KeyValuePipe } from '@angular/common';
import { UserSearchComponent } from '../../search/user-search.component';
import { GroupedMapCredits } from '../../../util';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { IconComponent } from '../../../icons';
import { AvatarComponent } from '../../avatar/avatar.component';

@Component({
  selector: 'm-map-credits-selection',
  templateUrl: 'map-credits-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapCreditsSelectionComponent),
      multi: true
    }
  ],
  imports: [
    CdkDropList,
    CdkDrag,
    UserSearchComponent,
    KeyValuePipe,
    IconComponent,
    TooltipDirective,
    FormsModule,
    AvatarComponent,
    ReactiveFormsModule
  ]
})
export class MapCreditsSelectionComponent implements ControlValueAccessor {
  protected value: GroupedMapCredits;

  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly connectedTo = Enum.values(MapCreditType).map(String);

  @ViewChildren(TooltipDirective)
  tooltips: QueryList<TooltipDirective>;

  addUser(
    type: MapCreditType,
    user: User,
    searchComponent: UserSearchComponent
  ) {
    const existingUserCredit = this.value
      .getAll()
      .find((userEntry) => userEntry.userID === user.id);
    if (existingUserCredit) {
      TooltipDirective.findByContext(this.tooltips, type).setAndShow(
        `User is already in the "${MapCreditNames.get(
          existingUserCredit.type
        )}" credits, just drag the credit instead!`,
        true
      );
    } else {
      searchComponent.resetSearchBox();
      this.value.add({ user, type, description: null });
      this.onChange(this.value);
    }
  }

  removeUser(type: MapCreditType, userID: number, alias: string) {
    const userIndex = this.value.get(type).findIndex(
      // Also check for alias to remove the correct placeholder.
      (credit) => credit.userID === userID && credit.alias === alias
    );
    if (userIndex === -1) return;
    this.value[type].splice(userIndex, 1);
    this.onChange(this.value);
  }

  addPlaceholder(type: MapCreditType, searchComponent: UserSearchComponent) {
    const existingPlaceholderCredit = this.value
      .getAll()
      .find(
        (placeholderEntry) =>
          placeholderEntry.alias === searchComponent.search.value
      );
    if (existingPlaceholderCredit) {
      TooltipDirective.findByContext(this.tooltips, type).setAndShow(
        `Placeholder is already in the "${MapCreditNames.get(
          existingPlaceholderCredit.type
        )}" credits, just drag the credit instead!`,
        true
      );
      return;
    }

    if (searchComponent.search.value.length > MAX_USER_ALIAS_LENGTH) {
      searchComponent.search.setErrors({
        error: `Placeholder cannot be longer than ${MAX_USER_ALIAS_LENGTH} characters!`
      });
      return;
    }

    this.value.add({ type, alias: searchComponent.search.value });
    searchComponent.resetSearchBox();
    this.onChange(this.value);
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Update the type of each inner credit when it gets moved between arrays
    this.value.updateInnerTypes();
    this.onChange(this.value);
  }

  writeValue(value: GroupedMapCredits | null): void {
    this.value = value ?? new GroupedMapCredits();
  }

  onChange: (value: GroupedMapCredits) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

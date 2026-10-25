import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { KeyValuePipe } from '@angular/common';
import { Component, forwardRef, QueryList, ViewChildren } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  MapCreditNames,
  MapCreditType,
  MAX_USER_ALIAS_LENGTH,
  User
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { UserSearchComponent } from '../../search/user-search.component';
import { IconComponent } from '../../../icons';
import { TooltipDirective } from '../../../directives/tooltip.directive';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AvatarComponent } from '../../avatar/avatar.component';
import {
  EditableMapCredit,
  GroupedMapCredits
} from '../../../util/grouped-map-credits.class';

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
  protected value!: GroupedMapCredits;

  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly connectedTo = Enum.values(MapCreditType).map(String);

  @ViewChildren(TooltipDirective)
  tooltips!: QueryList<TooltipDirective>;

  addUser(
    type: MapCreditType,
    user: User,
    searchComponent: UserSearchComponent
  ) {
    const existingUserCredit = this.value
      .getAll()
      .find((userEntry) => userEntry.userID === user.id);
    if (existingUserCredit) {
      TooltipDirective.findByContext(this.tooltips, type)?.setAndShow(
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

  removeUser(type: MapCreditType, userID: number | undefined, alias: string) {
    const userIndex = this.value.get(type).findIndex(
      // Also check for alias to remove the correct placeholder.
      (credit) => credit.userID === userID && credit.alias === alias
    );
    if (userIndex === -1) return;
    this.value.get(type).splice(userIndex, 1);
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
      TooltipDirective.findByContext(this.tooltips, type)?.setAndShow(
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

  drop(event: CdkDragDrop<EditableMapCredit[]>) {
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

  onTouched: () => void = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

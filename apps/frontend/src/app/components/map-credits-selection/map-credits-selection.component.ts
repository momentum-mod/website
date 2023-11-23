import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule
} from '@angular/forms';
import { Component, forwardRef, QueryList, ViewChildren } from '@angular/core';
import { SortedMapCredits } from './sorted-map-credits.class';
import {
  MapCreditNames,
  MapCreditType,
  STEAM_MISSING_AVATAR_URL,
  User
} from '@momentum/constants';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDropList,
  CdkDrag
} from '@angular/cdk/drag-drop';
import {
  NbPopoverDirective,
  NbPopoverModule,
  NbUserModule
} from '@nebular/theme';
import { UserSearchComponent } from '../user-search/user-search.component';
import { Enum } from '@momentum/enum';
import { showPopoverDuration } from '../../utils/popover-utils';
import { NgFor, NgIf, KeyValuePipe } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';

@Component({
  selector: 'mom-map-credits-selection',
  templateUrl: 'map-credits-selection.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MapCreditsSelectionComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [
    NgFor,
    CdkDropList,
    NbPopoverModule,
    CdkDrag,
    NbUserModule,
    IconComponent,
    FormsModule,
    UserSearchComponent,
    NgIf,
    KeyValuePipe
  ]
})
export class MapCreditsSelectionComponent implements ControlValueAccessor {
  protected value: SortedMapCredits;

  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly connectedTo = Enum.values(MapCreditType).map(String);

  @ViewChildren(NbPopoverDirective)
  popovers: QueryList<NbPopoverDirective>;

  addUser(
    type: MapCreditType,
    user: User,
    searchComponent: UserSearchComponent
  ) {
    const alreadyContainsUser = this.value
      .getAll()
      .some((userEntry) => userEntry.user.id === user.id);
    if (alreadyContainsUser) {
      const popover = this.popovers.find((p) => p.context === type);
      showPopoverDuration(
        popover,
        `User is already in the "${MapCreditNames.get(
          type
        )}" credits, just drag the credit instead!`
      );
    } else {
      searchComponent.resetSearchBox();
      this.value[type].push({ user, type });
      this.onChange(this.value);
    }
  }

  removeUser(type: MapCreditType, user: Partial<User>) {
    const userIndex = this.value[type].findIndex(
      (credit) => credit.user.id === user.id
    );
    if (userIndex === -1) return;
    this.value[type].splice(userIndex, 1);
    this.onChange(this.value);
  }

  addPlaceholder(type: MapCreditType, input: HTMLInputElement) {
    const alias = input.value;
    input.value = '';
    this.value[type].push({
      user: { alias, avatarURL: STEAM_MISSING_AVATAR_URL },
      type,
      placeholder: true
    });
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
    this.onChange(this.value);
  }

  writeValue(value: SortedMapCredits | null): void {
    this.value = value ?? new SortedMapCredits();
  }

  onChange: (value: SortedMapCredits) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

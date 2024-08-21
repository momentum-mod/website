import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
  Validators
} from '@angular/forms';
import { Component, forwardRef, QueryList, ViewChildren } from '@angular/core';
import { MapCreditNames, MapCreditType, User } from '@momentum/constants';
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
import { SharedModule } from '../../../shared.module';
import { TooltipDirective } from '../../../directives/tooltip.directive';

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
  standalone: true,
  imports: [
    SharedModule,
    CdkDropList,
    CdkDrag,
    UserSearchComponent,
    KeyValuePipe
  ]
})
export class MapCreditsSelectionComponent implements ControlValueAccessor {
  protected value: GroupedMapCredits;

  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly connectedTo = Enum.values(MapCreditType).map(String);

  protected readonly placeholderInputs = new Map(
    Enum.values(MapCreditType).map((type) => [
      type,
      new FormControl<string>('', {
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(32)
        ]
      })
    ])
  );

  @ViewChildren(TooltipDirective)
  tooltips: QueryList<TooltipDirective>;

  addUser(
    type: MapCreditType,
    user: User,
    searchComponent: UserSearchComponent
  ) {
    const alreadyContainsUser = this.value
      .getAll()
      .some((userEntry) => userEntry.userID === user.id);
    if (alreadyContainsUser) {
      TooltipDirective.findByContext(this.tooltips, type).setAndShow(
        `User is already in the "${MapCreditNames.get(
          type
        )}" credits, just drag the credit instead!`,
        true
      );
    } else {
      searchComponent.resetSearchBox();
      this.value.add({ user, type, description: null });
      this.onChange(this.value);
    }
  }

  removeUser(type: MapCreditType, userID: number) {
    const userIndex = this.value
      .get(type)
      .findIndex((credit) => credit.userID === userID);
    if (userIndex === -1) return;
    this.value[type].splice(userIndex, 1);
    this.onChange(this.value);
  }

  addPlaceholder(type: MapCreditType, input: string) {
    this.value.add({ type, alias: input });
    this.placeholderInputs.get(type).reset();
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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MapCreditNames, MapCreditType, User } from '@momentum/constants';
import { SortedMapCredits } from '../../../components/map-credits-selection/sorted-map-credits.class';
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropList,
  CdkDrag
} from '@angular/cdk/drag-drop';

import { SharedModule } from '../../../shared.module';
import { UserSearchComponent } from '../../../components/search/user-search/user-search.component';
import { AvatarComponent } from '../../../components/avatar/avatar.component';

enum SearchState {
  HIDDEN,
  VISIBLE,
  USER_ALREADY_SELECTED
}

/**
 * TODO: This component can be removed soon once every instance has been replaced
 * with map-credits-selection.
 */

@Component({
  selector: 'm-map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.css'],
  standalone: true,
  imports: [
    SharedModule,
    CdkDropList,
    CdkDrag,
    UserSearchComponent,
    AvatarComponent
  ]
})
export class MapCreditsComponent {
  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly SearchState = SearchState;
  searchStates: Record<MapCreditType, SearchState> = {
    [MapCreditType.AUTHOR]: SearchState.HIDDEN,
    [MapCreditType.CONTRIBUTOR]: SearchState.HIDDEN,
    [MapCreditType.TESTER]: SearchState.HIDDEN,
    [MapCreditType.SPECIAL_THANKS]: SearchState.HIDDEN
  };

  @Input() editable = false;
  @Input() credits: SortedMapCredits;

  /**
   * This is used to alert the parent component that the credits have changed.
   * It's required so we can update a credits FormGroup on map-edit and
   * map-submission that requires at least one author credit.
   */
  @Output() creditChange = new EventEmitter();

  addUser(type: MapCreditType, user: User) {
    const alreadyContainsUser = this.credits
      .getAll()
      .some((userEntry) => userEntry.user.id === user.id);
    if (alreadyContainsUser) {
      this.searchStates[type] = SearchState.USER_ALREADY_SELECTED;
    } else {
      this.credits[type].push({ user, type });
      this.creditChange.emit();
      this.hideUserSearch(type);
    }
  }

  removeUser(type: MapCreditType, user: Partial<User>) {
    const userIndex = this.credits[type].findIndex(
      (credit) => credit.user.id === user.id
    );
    if (userIndex === -1) return;
    this.credits[type].splice(userIndex, 1);
    this.creditChange.emit();
  }

  showUserSearch(type: MapCreditType) {
    this.searchStates[type] = SearchState.VISIBLE;
  }

  hideUserSearch(type: MapCreditType) {
    this.searchStates[type] = SearchState.HIDDEN;
  }

  drop(event: CdkDragDrop<User[]>, type: MapCreditType) {
    if (!this.editable) return;
    moveItemInArray(
      this.credits[type],
      event.previousIndex,
      event.currentIndex
    );
    this.creditChange.emit();
  }
}

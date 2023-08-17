import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MapCreditNames, MapCreditType, User } from '@momentum/constants';
import { SortedMapCredits } from './sorted-map-credits.class';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

enum SearchState {
  HIDDEN,
  VISIBLE,
  USER_ALREADY_SELECTED
}

@Component({
  selector: 'mom-map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.scss']
})
export class MapCreditsComponent {
  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  protected readonly SearchState = SearchState;
  searchStates: Record<MapCreditType, SearchState>;

  @Input() editable: boolean;
  @Input() credits: SortedMapCredits;

  /**
   * This is used to alert the parent component that the credits have changed.
   * It's required so we can update a credits FormGroup on map-edit and
   * map-submission that requires at least one author credit.
   */
  @Output() creditChange: EventEmitter<void>;

  constructor() {
    this.editable = false;
    this.creditChange = new EventEmitter();
    this.searchStates = {
      [MapCreditType.AUTHOR]: SearchState.HIDDEN,
      [MapCreditType.CONTRIBUTOR]: SearchState.HIDDEN,
      [MapCreditType.TESTER]: SearchState.HIDDEN,
      [MapCreditType.SPECIAL_THANKS]: SearchState.HIDDEN
    };
  }

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

  removeUser(type: MapCreditType, user: User) {
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

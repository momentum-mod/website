import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MapCredit, User } from '@momentum/types';
import { MapCreditType } from '@momentum/constants';

export interface CreditChangeEvent {
  user: User;
  added: boolean;
  type: MapCreditType;
}

enum SearchState {
  HIDDEN,
  VISIBLE,
  USER_ALREADY_SELECTED
}

@Component({
  selector: 'mom-map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss']
})
export class MapCreditComponent {
  @Input() category: string;
  @Input() type: MapCreditType;
  @Input() credits: Record<MapCreditType, Partial<MapCredit>[]>;
  @Input() editable: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;

  protected readonly SearchState = SearchState;
  searchState: SearchState;

  constructor() {
    this.creditChange = new EventEmitter<CreditChangeEvent>();
    this.searchState = SearchState.HIDDEN;
  }

  addUser(user: User) {
    const alreadyContainsUser = Object.values(this.credits)
      .flat()
      .some((userEntry) => userEntry.id === user.id);
    if (alreadyContainsUser) {
      this.searchState = SearchState.USER_ALREADY_SELECTED;
    } else {
      this.credits[this.type].push({ user });
      this.creditChange.emit({ type: this.type, user, added: true });
      this.hideUserSearch();
    }
  }

  removeUser(user: User) {
    const userIndex = this.credits[this.type].findIndex(
      (credit) => credit.user.id === user.id
    );
    if (userIndex === -1) return;
    this.credits[this.type].splice(userIndex, 1);
    this.creditChange.emit({ type: this.type, user, added: false });
  }

  showUserSearch() {
    this.searchState = SearchState.VISIBLE;
  }

  hideUserSearch() {
    this.searchState = SearchState.HIDDEN;
  }

  drop(event: CdkDragDrop<User[]>) {
    if (!this.editable) return;
    moveItemInArray(
      this.credits[this.type],
      event.previousIndex,
      event.currentIndex
    );
    this.creditChange.emit({ type: this.type, user: null, added: false });
  }
}

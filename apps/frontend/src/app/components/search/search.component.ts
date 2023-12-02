import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSearchComponent } from './user-search/user-search.component';

enum SearchType {
  USER,
  MAP
}

@Component({
  selector: 'm-search',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSearchComponent],
  templateUrl: './search.component.html',
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-width: 24rem;
      }
    `
  ]
})
export class SearchComponent {
  protected readonly SearchType = SearchType;
  protected activeType: SearchType = SearchType.MAP;
}

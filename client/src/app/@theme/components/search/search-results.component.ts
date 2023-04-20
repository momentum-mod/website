import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent {
  @Input('user') usersResults: boolean;
  @Input() onlyUsers: boolean;
  @Input() onlyMaps: boolean;
  @Input() elems: any[];
  @Output() selectedURL: EventEmitter<string> = new EventEmitter();
  constructor() {}

  getElemName(elem: any): string {
    return this.usersResults ? elem.alias : elem.name;
  }
  getElemURL(elem: any): string {
    return this.usersResults
      ? '/dashboard/profile/' + elem.id
      : '/dashboard/maps/' + elem.id;
  }

  getElemPicture(elem: any) {
    return this.usersResults ? elem.avatarURL : elem.thumbnail.small;
  }

  shouldShowEmpty(): boolean {
    return this.usersResults
      ? !this.onlyMaps && this.elems && this.elems.length === 0
      : !this.onlyUsers && this.elems && this.elems.length === 0;
  }

  clickElem(elem: any) {
    this.selectedURL.emit(this.getElemURL(elem));
  }
}

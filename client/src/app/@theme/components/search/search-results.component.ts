import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
})
export class SearchResultsComponent {
  @Input('user') usersResults: boolean;
  @Input('onlyUsers') onlyUsers: boolean;
  @Input('onlyMaps') onlyMaps: boolean;
  @Input('elems') elems: any[];
  @Output() selectedURL: EventEmitter<string> = new EventEmitter();
  constructor() {
  }

  getElemName(elem: any): string {
    if (this.usersResults)
      return elem.alias;
    else
      return elem.name;
  }
  getElemURL(elem: any): string {
    if (this.usersResults)
      return '/dashboard/profile/' + elem.id;
    else
      return '/dashboard/maps/' + elem.id;
  }

  getElemPicture(elem: any) {
    if (this.usersResults)
      return elem.avatarURL;
    else
      return elem.info.avatarURL;
  }

  shouldShowEmpty(): boolean {
    if (this.usersResults) {
      return !this.onlyMaps && this.elems && this.elems.length === 0;
    } else {
      return !this.onlyUsers && this.elems && this.elems.length === 0;
    }
  }

  clickElem(elem: any) {
    this.selectedURL.emit(this.getElemURL(elem));
  }
}

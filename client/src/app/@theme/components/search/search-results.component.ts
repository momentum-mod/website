import {Component, Input} from '@angular/core';

@Component({
  selector: 'search-results',
  templateUrl: './search-results.component.html',
})
export class SearchResultsComponent {
  @Input('user') usersResults: boolean;
  @Input('elems') elems: any[];
  constructor() {
  }

  getElemName(elem: any): string {
    if (this.usersResults)
      return elem.profile.alias;
    else
      return elem.name;
  }
  getElemURL(elem: any): string {
    if (this.usersResults)
      return '/dashboard/profile/' + elem.id;
    else
      return '/dashboard/maps/' + elem.id;
  }
}

import { Component, input } from '@angular/core';
import { Subject } from 'rxjs';
import { MMap } from '@momentum/constants';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MapListItemComponent } from './map-list-item.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'm-map-list',
  templateUrl: './map-list.component.html',
  imports: [MapListItemComponent, InfiniteScrollDirective, SpinnerComponent]
})
export class MapListComponent {
  readonly maps = input.required<MMap[]>();
  readonly loading = input.required<boolean>();
  readonly loadMore = input.required<Subject<void>>();
  readonly isSubmissionPage = input(false);
  readonly isAdminPage = input(false);
  readonly showApprovedDate = input(false);
}

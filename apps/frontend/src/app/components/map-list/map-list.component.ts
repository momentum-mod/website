import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { MMap } from '@momentum/constants';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MapListItemComponent } from './map-list-item.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'm-map-list',
  templateUrl: './map-list.component.html',
  standalone: true,
  imports: [MapListItemComponent, InfiniteScrollModule, SpinnerComponent]
})
export class MapListComponent {
  @Input({ required: true }) maps: MMap[];
  @Input({ required: true }) loading: boolean;
  @Input({ required: true }) loadMore: Subject<void>;
  @Input() isSubmissionPage = false;
  @Input() isAdminPage = false;
}

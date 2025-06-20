import { Component, Input } from '@angular/core';
import { MapSortType } from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'm-map-sort',
  templateUrl: 'map-sort.component.html',
  styles: `
    #sortMenuOpenButton {
      anchor-name: --sortMenuOpenButton;
    }
    #sortMenu {
      position-anchor: --sortMenuOpenButton;
      top: anchor(bottom);
      left: anchor(left);
    }
  `,
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: MapSortComponent
    }
  ]
})
export class MapSortComponent implements ControlValueAccessor {
  protected currentSortOption: MapSortType;

  // First element is used as default for dropdown button in template.
  @Input() sorts: MapSortType[] = [MapSortType.DATE_RELEASED_NEWEST];

  protected readonly textMap = new Map<MapSortType, string>([
    [MapSortType.DATE_RELEASED_NEWEST, 'Date Released (Newest)'],
    [MapSortType.DATE_RELEASED_OLDEST, 'Date Released (Oldest)'],
    [MapSortType.DATE_CREATED_NEWEST, 'Date Created (Newest)'],
    [MapSortType.DATE_CREATED_OLDEST, 'Date Created (Oldest)'],
    [MapSortType.ALPHABETICAL, 'Alphabetical (A-Z)'],
    [MapSortType.REVERSE_ALPHABETICAL, 'Alphabetical (Z-A)'],
    [MapSortType.TIER_LOWEST, 'Tier (1-10)'],
    [MapSortType.TIER_HIGHEST, 'Tier (10-1)'],
    [MapSortType.PLAYED_NEWEST, 'Last Played (Newest)'],
    [MapSortType.PLAYED_OLDEST, 'Last Played (Oldest)'],
    [MapSortType.PB_NEWEST, 'Last PB (Newest)'],
    [MapSortType.PB_OLDEST, 'Last PB (Oldest)'],
    [MapSortType.FAVORITED_MOST, 'Most Favorited'],
    [MapSortType.FAVORITED_LEAST, 'Least Favorited'],
    // Abbreviation hack to avoid text overflow, while still keeping same width.
    [MapSortType.SUBMISSION_CREATED_NEWEST, 'Submission Created (New)'],
    [MapSortType.SUBMISSION_CREATED_OLDEST, 'Submission Created (Old)'],
    [MapSortType.SUBMISSION_UPDATED_NEWEST, 'Submission Updated (New)'],
    [MapSortType.SUBMISSION_UPDATED_OLDEST, 'Submission Updated (Old)']
  ]);

  updateSortOption(chosenSort: MapSortType) {
    document.getElementById('sortMenuOpenButton').firstElementChild.innerHTML =
      this.textMap.get(chosenSort);

    this.currentSortOption = chosenSort;

    this.onChange(this.currentSortOption);
  }

  writeValue(sortOption: MapSortType): void {
    this.currentSortOption = sortOption;
  }

  onChange: (sortOption: MapSortType) => void = () => void 0;
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  onTouched = () => void 0;
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}

import { Component, Input } from '@angular/core';
import { MapSortType, MapSortTypeText } from '@momentum/constants';
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
  // First element is used as default for dropdown button in template.
  @Input() sorts: MapSortType[] = [];

  protected currentSortOption: MapSortType;

  protected readonly MapSortTypeText = MapSortTypeText;

  updateSortOption(chosenSort: MapSortType) {
    document.getElementById('sortMenuOpenButton').firstElementChild.innerHTML =
      this.MapSortTypeText.get(chosenSort);

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

import { Component } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { MapListComponent, MapListFiltersForm } from '../../../components';
import { Gamemode, ORDERED_GAMEMODES } from '@momentum/constants';
import { FormControl, FormGroup } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CardHeaderComponent } from '../../../components';

@Component({
  templateUrl: 'map-browser.component.html',
  standalone: true,
  imports: [
    SharedModule,
    MapListComponent,
    DropdownModule,
    InputSwitchModule,
    CardHeaderComponent
  ]
})
export class MapBrowserComponent {
  protected readonly ORDERED_GAMEMODES = ORDERED_GAMEMODES;

  // TODO: Add a <m-user-search> here for selecting authors (that component will
  // provide the necessary submitterID), as well as a PrimeNG slider for
  // tiers. The map-list component should work with those already.
  filters = new FormGroup({
    search: new FormControl<string>(''),
    gamemode: new FormControl<Gamemode>(null),
    favorites: new FormControl<boolean>(false)
  }) as MapListFiltersForm;
}

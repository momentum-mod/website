import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapCreditsComponent } from './map-credits.component';
import {
  NbCardModule,
  NbListModule,
  NbPopoverModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';
import { UserSearchComponent } from '../../../../components/user-search/user-search.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SortedMapCredits } from './sorted-map-credits.class';

describe('MapCreditsComponent', () => {
  let component: MapCreditsComponent;
  let fixture: ComponentFixture<MapCreditsComponent>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NbThemeModule.forRoot(),
        NbListModule,
        NbCardModule,
        NbPopoverModule,
        NbUserModule,
        HttpClientTestingModule
      ],
      declarations: [MapCreditsComponent, UserSearchComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapCreditsComponent);
    component = fixture.componentInstance;
    component.credits = new SortedMapCredits();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

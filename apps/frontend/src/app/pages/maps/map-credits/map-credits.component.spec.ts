import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapCreditsComponent } from './map-credits.component';
import { UserSearchComponent } from '../../../components/search/user-search/user-search.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SortedMapCredits } from '../../../components/map-credits-selection/sorted-map-credits.class';
import { SharedModule } from '../../../shared.module';

describe('MapCreditsComponent', () => {
  let component: MapCreditsComponent;
  let fixture: ComponentFixture<MapCreditsComponent>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule, HttpClientTestingModule],
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

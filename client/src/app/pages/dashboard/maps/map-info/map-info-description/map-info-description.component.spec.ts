import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapInfoDescriptionComponent } from './map-info-description.component';

describe('MapInfoDescriptionComponent', () => {
  let component: MapInfoDescriptionComponent;
  let fixture: ComponentFixture<MapInfoDescriptionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapInfoDescriptionComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapInfoDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

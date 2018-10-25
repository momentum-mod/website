import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLibraryComponent } from './map-library.component';

describe('MapLibraryComponent', () => {
  let component: MapLibraryComponent;
  let fixture: ComponentFixture<MapLibraryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapLibraryComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

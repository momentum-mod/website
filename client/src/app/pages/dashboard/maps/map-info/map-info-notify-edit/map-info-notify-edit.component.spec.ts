import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapNotifyEditComponent } from './map-info-notify-edit.component';

describe('MapNotifyEditComponent', () => {
  let component: MapNotifyEditComponent;
  let fixture: ComponentFixture<MapNotifyEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapNotifyEditComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapNotifyEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

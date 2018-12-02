import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapListItemComponent } from './map-list-item.component';
import {NbUserModule} from '@nebular/theme';
import {RouterTestingModule} from '@angular/router/testing';

describe('MapListItemComponent', () => {
  let component: MapListItemComponent;
  let fixture: ComponentFixture<MapListItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule, RouterTestingModule],
      declarations: [ MapListItemComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

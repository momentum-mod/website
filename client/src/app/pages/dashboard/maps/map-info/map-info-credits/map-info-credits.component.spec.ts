import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {NbUserModule} from '@nebular/theme';
import { MapInfoCreditsComponent } from './map-info-credits.component';
import {RouterTestingModule} from '@angular/router/testing';

describe('MapInfoCreditsComponent', () => {
  let component: MapInfoCreditsComponent;
  let fixture: ComponentFixture<MapInfoCreditsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule, RouterTestingModule],
      declarations: [ MapInfoCreditsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapInfoCreditsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

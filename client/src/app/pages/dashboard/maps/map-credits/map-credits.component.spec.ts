import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {MapCreditsComponent} from './map-credits.component';
import {MapCreditComponent} from './map-credit/map-credit.component';
import {NbCardModule, NbListModule, NbPopoverModule, NbThemeModule, NbUserModule} from '@nebular/theme';
import {UserModule} from '../../user/user.module';
import {HttpClientTestingModule} from '@angular/common/http/testing';

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
        UserModule,
        HttpClientTestingModule,
      ],
      declarations: [ MapCreditsComponent, MapCreditComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapCreditsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

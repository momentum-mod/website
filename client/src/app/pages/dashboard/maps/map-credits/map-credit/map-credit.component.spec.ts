import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapCreditComponent } from './map-credit.component';
import {
  NbCardModule,
  NbListModule,
  NbPopoverModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';
import { UserModule } from '../../../user/user.module';
import { MapCreditType } from '../../../../../@core/models/map-credit-type.model';

describe('MapCreditComponent', () => {
  let component: MapCreditComponent;
  let fixture: ComponentFixture<MapCreditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NbThemeModule,
        NbListModule,
        NbCardModule,
        NbUserModule,
        NbPopoverModule,
        UserModule
      ],
      declarations: [MapCreditComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapCreditComponent);
    component = fixture.componentInstance;
    component.creditArr = [[], [], [], []];
    component.credType = MapCreditType.AUTHOR;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

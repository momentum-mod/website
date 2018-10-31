import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MapCreditComponent} from './map-credit.component';
import {NbCardModule, NbListModule, NbPopoverModule, NbThemeModule, NbUserModule} from '@nebular/theme';
import {UserModule} from '../../../user/user.module';

describe('MapCreditComponent', () => {
  let component: MapCreditComponent;
  let fixture: ComponentFixture<MapCreditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbThemeModule, NbListModule, NbCardModule, NbUserModule, NbPopoverModule, UserModule],
      declarations: [ MapCreditComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapCreditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

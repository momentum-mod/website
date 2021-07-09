import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {MapLeaderboardComponent} from './map-leaderboard.component';
import {RouterTestingModule} from '@angular/router/testing';
import {
  NbCardModule,
  NbCheckboxModule,
  NbToastrConfig,
  NbToastRef,
  NbToastrService,
  NbUserModule,
} from '@nebular/theme';
import {TimingPipe} from '../../../../../@theme/pipes';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TimeagoModule} from 'ngx-timeago';

describe('MapLeaderboardComponent', () => {
  let component: MapLeaderboardComponent;
  let fixture: ComponentFixture<MapLeaderboardComponent>;

  let toastrStub: Partial<NbToastrService>;
  beforeEach(waitForAsync(() => {
    toastrStub = {
      danger(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
      success(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
    };
    TestBed.configureTestingModule({
      imports: [
        NbUserModule,
        NbCardModule,
        NbCheckboxModule,
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
        TimeagoModule,
      ],
      declarations: [ MapLeaderboardComponent, TimingPipe ],
      providers: [
        { provide: NbToastrService, useValue: toastrStub },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapLeaderboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

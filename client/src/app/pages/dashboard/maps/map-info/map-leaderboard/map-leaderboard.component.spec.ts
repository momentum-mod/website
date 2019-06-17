import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLeaderboardComponent } from './map-leaderboard.component';
import {RouterTestingModule} from '@angular/router/testing';
import {NbCardModule, NbToastrModule, NbUserModule} from '@nebular/theme';
import {TimingPipe} from '../../../../../@theme/pipes';
import {TimeAgoPipe} from 'time-ago-pipe';
import {HttpClientTestingModule} from '@angular/common/http/testing';

describe('MapLeaderboardComponent', () => {
  let component: MapLeaderboardComponent;
  let fixture: ComponentFixture<MapLeaderboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NbUserModule,
        NbCardModule,
        NbToastrModule.forRoot(),
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
      ],
      declarations: [ MapLeaderboardComponent, TimingPipe, TimeAgoPipe ],
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

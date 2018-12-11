import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLeaderboardComponent } from './map-leaderboard.component';
import {RouterTestingModule} from '@angular/router/testing';
import {NbUserModule} from '@nebular/theme';
import {NumberTrimPipe} from '../../../../../@theme/pipes';
import {TimeAgoPipe} from 'time-ago-pipe';
import {HttpClientTestingModule} from '@angular/common/http/testing';

describe('MapLeaderboardComponent', () => {
  let component: MapLeaderboardComponent;
  let fixture: ComponentFixture<MapLeaderboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NbUserModule,
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
      ],
      declarations: [ MapLeaderboardComponent, NumberTrimPipe, TimeAgoPipe ],
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

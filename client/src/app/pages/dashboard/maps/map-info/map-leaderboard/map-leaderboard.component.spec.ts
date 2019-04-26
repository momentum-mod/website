import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLeaderboardComponent } from './map-leaderboard.component';
import {RouterTestingModule} from '@angular/router/testing';
import {NbCardModule, NbUserModule} from '@nebular/theme';
import {TimingPipe} from '../../../../../@theme/pipes';
import {TimeAgoPipe} from 'time-ago-pipe';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ToasterModule} from 'angular2-toaster';

describe('MapLeaderboardComponent', () => {
  let component: MapLeaderboardComponent;
  let fixture: ComponentFixture<MapLeaderboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NbUserModule,
        NbCardModule,
        ToasterModule.forRoot(),
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
